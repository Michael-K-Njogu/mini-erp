-- Public demo mode: every visitor (anonymous or not) gets an isolated, seeded
-- workspace. Apply to the dedicated DEMO project only. Existing rows in a project
-- with prior data would have no owner_id and become invisible.

-- ---------------------------------------------------------------------------
-- 1. Ownership columns and per-owner uniqueness
-- ---------------------------------------------------------------------------

ALTER TABLE public.customers ADD COLUMN owner_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE public.products ADD COLUMN owner_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE public.inventory ADD COLUMN owner_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE public.stock_movements ADD COLUMN owner_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE public.orders ADD COLUMN owner_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE public.order_items ADD COLUMN owner_id uuid NOT NULL DEFAULT auth.uid();

ALTER TABLE public.notifications ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.stock_movements ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE INDEX customers_owner_id_idx ON public.customers (owner_id);
CREATE INDEX products_owner_id_idx ON public.products (owner_id);
CREATE INDEX inventory_owner_id_idx ON public.inventory (owner_id);
CREATE INDEX stock_movements_owner_id_idx ON public.stock_movements (owner_id);
CREATE INDEX orders_owner_id_idx ON public.orders (owner_id);
CREATE INDEX order_items_owner_id_idx ON public.order_items (owner_id);

ALTER TABLE public.products DROP CONSTRAINT products_sku_key;
ALTER TABLE public.products ADD CONSTRAINT products_owner_sku_key UNIQUE (owner_id, sku);

ALTER TABLE public.orders DROP CONSTRAINT orders_order_number_key;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_owner_order_number_key UNIQUE (owner_id, order_number);

DROP INDEX IF EXISTS public.customers_customer_number_key;
CREATE UNIQUE INDEX customers_owner_customer_number_key
  ON public.customers (owner_id, customer_number);

-- ---------------------------------------------------------------------------
-- 2. Row level security: each user only sees and changes their own rows
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers', 'products', 'inventory', 'stock_movements', 'orders', 'order_items'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (owner_id = (SELECT auth.uid()))
         WITH CHECK (owner_id = (SELECT auth.uid()))',
      t || '_owner_all', t
    );
  END LOOP;
END
$$;

CREATE POLICY notifications_owner_all ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Profiles are read-only for clients so nobody can change their own role.
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Abuse protection: per-owner row caps
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_row_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  row_count bigint;
BEGIN
  EXECUTE format('SELECT count(*) FROM %I.%I WHERE owner_id = $1', TG_TABLE_SCHEMA, TG_TABLE_NAME)
    INTO row_count
    USING NEW.owner_id;

  IF row_count >= TG_ARGV[0]::bigint THEN
    RAISE EXCEPTION 'Demo limit reached: at most % rows are allowed in %.',
      TG_ARGV[0], TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER customers_row_cap BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_row_cap(50);
CREATE TRIGGER products_row_cap BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_row_cap(50);
CREATE TRIGGER orders_row_cap BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_row_cap(100);
CREATE TRIGGER order_items_row_cap BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_row_cap(500);
CREATE TRIGGER stock_movements_row_cap BEFORE INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_row_cap(500);

-- ---------------------------------------------------------------------------
-- 4. Order audit trigger: works for seeding and for users without an email
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_order_actor_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  actor_id uuid := COALESCE(auth.uid(), NEW.owner_id);
  actor_name text;
BEGIN
  -- Seed data supplies its own actors and timestamps.
  IF current_setting('app.seeding', true) = 'on' THEN
    RETURN NEW;
  END IF;

  actor_name := COALESCE(
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    NULLIF(auth.jwt() ->> 'email', ''),
    (SELECT NULLIF(display_name, '') FROM public.profiles WHERE id = actor_id),
    'Demo Visitor'
  );

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := actor_id;
    NEW.created_by_name := actor_name;
    NEW.posted_by := NULL;
    NEW.posted_by_name := NULL;
    NEW.processing_started_by := NULL;
    NEW.processing_started_by_name := NULL;
    NEW.completed_by := NULL;
    NEW.completed_by_name := NULL;
    NEW.canceled_by := NULL;
    NEW.canceled_by_name := NULL;
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_by_name := OLD.created_by_name;
    NEW.posted_by := OLD.posted_by;
    NEW.posted_by_name := OLD.posted_by_name;
    NEW.processing_started_by := OLD.processing_started_by;
    NEW.processing_started_by_name := OLD.processing_started_by_name;
    NEW.completed_by := OLD.completed_by;
    NEW.completed_by_name := OLD.completed_by_name;
    NEW.canceled_by := OLD.canceled_by;
    NEW.canceled_by_name := OLD.canceled_by_name;
  END IF;

  NEW.updated_by := actor_id;
  NEW.updated_by_name := actor_name;

  IF TG_OP = 'INSERT' THEN
    IF NEW.posted_at IS NOT NULL THEN
      NEW.posted_by := actor_id;
      NEW.posted_by_name := actor_name;
    END IF;
    IF NEW.processing_started_at IS NOT NULL THEN
      NEW.processing_started_by := actor_id;
      NEW.processing_started_by_name := actor_name;
    END IF;
    IF NEW.completed_at IS NOT NULL THEN
      NEW.completed_by := actor_id;
      NEW.completed_by_name := actor_name;
    END IF;
    IF NEW.canceled_at IS NOT NULL THEN
      NEW.canceled_by := actor_id;
      NEW.canceled_by_name := actor_name;
    END IF;
  ELSE
    IF (NEW.posted_at IS DISTINCT FROM OLD.posted_at AND NEW.posted_at IS NOT NULL)
       OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'Pending') THEN
      NEW.posted_by := actor_id;
      NEW.posted_by_name := actor_name;
    END IF;
    IF (NEW.processing_started_at IS DISTINCT FROM OLD.processing_started_at
        AND NEW.processing_started_at IS NOT NULL)
       OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'Processing') THEN
      NEW.processing_started_by := actor_id;
      NEW.processing_started_by_name := actor_name;
    END IF;
    IF (NEW.completed_at IS DISTINCT FROM OLD.completed_at AND NEW.completed_at IS NOT NULL)
       OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'Completed') THEN
      NEW.completed_by := actor_id;
      NEW.completed_by_name := actor_name;
    END IF;
    IF (NEW.canceled_at IS DISTINCT FROM OLD.canceled_at AND NEW.canceled_at IS NOT NULL)
       OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'Canceled') THEN
      NEW.canceled_by := actor_id;
      NEW.canceled_by_name := actor_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Stock adjustments: authorise via profile role and ownership
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_inventory public.inventory%ROWTYPE;
  v_new_quantity numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Operations')
  ) THEN
    RAISE EXCEPTION 'Not authorized to adjust stock';
  END IF;

  IF p_movement_type IS NULL OR p_movement_type NOT IN ('stock_in', 'stock_out') THEN
    RAISE EXCEPTION 'Invalid movement type';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF NULLIF(TRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  SELECT *
  INTO v_inventory
  FROM public.inventory
  WHERE product_id = p_product_id AND owner_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory record not found';
  END IF;

  v_new_quantity :=
    v_inventory.quantity_on_hand +
    CASE WHEN p_movement_type = 'stock_in' THEN p_quantity ELSE -p_quantity END;

  IF v_new_quantity < v_inventory.quantity_reserved THEN
    RAISE EXCEPTION 'Insufficient available stock';
  END IF;

  UPDATE public.inventory
  SET quantity_on_hand = v_new_quantity, updated_at = NOW()
  WHERE id = v_inventory.id;

  INSERT INTO public.stock_movements (
    product_id, movement_type, quantity, reason, notes, created_by, owner_id
  )
  VALUES (
    p_product_id, p_movement_type, p_quantity, p_reason, p_notes, auth.uid(), auth.uid()
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. Seed data
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.seed_demo_data(p_owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stamp text := to_char(now(), 'YYMMDD');
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid();
  c5 uuid := gen_random_uuid();
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  p5 uuid := gen_random_uuid();
  p6 uuid := gen_random_uuid();
  p7 uuid := gen_random_uuid();
  p8 uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid();
  o2 uuid := gen_random_uuid();
  o3 uuid := gen_random_uuid();
  o4 uuid := gen_random_uuid();
  o5 uuid := gen_random_uuid();
  o6 uuid := gen_random_uuid();
BEGIN
  IF EXISTS (SELECT 1 FROM public.customers WHERE owner_id = p_owner) THEN
    RETURN;
  END IF;

  PERFORM set_config('app.seeding', 'on', true);

  INSERT INTO public.customers (
    id, owner_id, customer_number, name, email, customer_type, sector, region, city,
    vat_number, contact_person, phone_primary, delivery_address, credit_limit,
    credit_status, created_at
  ) VALUES
    (c1, p_owner, 'CUST-' || stamp || '-0001', 'Skyline Builders Ltd', 'procurement@skylinebuilders.example',
     'wholesale', 'Real Estate', 'Nairobi', 'Nairobi', 'P051234567A', 'Amina Wanjiru',
     '+254 700 100 001', 'Mombasa Road, Industrial Area', 2500000, 'Active', now() - interval '90 days'),
    (c2, p_owner, 'CUST-' || stamp || '-0002', 'Mwangi Hardware', 'orders@mwangihardware.example',
     'retail', 'Manufacturing', 'Nakuru', 'Nakuru', 'P051234568B', 'Peter Mwangi',
     '+254 700 100 002', 'Kenyatta Avenue, Nakuru', 400000, 'Active', now() - interval '70 days'),
    (c3, p_owner, 'CUST-' || stamp || '-0003', 'Lakeside Developers', 'projects@lakeside.example',
     'project', 'Real Estate', 'Kisumu', 'Kisumu', 'P051234569C', 'Grace Achieng',
     '+254 700 100 003', 'Milimani Estate, Kisumu', 1800000, 'Active', now() - interval '45 days'),
    (c4, p_owner, 'CUST-' || stamp || '-0004', 'Coastal Contractors', 'info@coastalcontractors.example',
     'project', 'Transportation & Logistics', 'Mombasa', 'Mombasa', 'P051234570D', 'Hassan Ali',
     '+254 700 100 004', 'Nyali Road, Mombasa', 1200000, 'Suspended', now() - interval '30 days'),
    (c5, p_owner, 'CUST-' || stamp || '-0005', 'Kilimani Interiors', 'hello@kilimaniinteriors.example',
     'retail', 'Hospitality & Tourism', 'Nairobi', 'Nairobi', 'P051234571E', 'Faith Njeri',
     '+254 700 100 005', 'Argwings Kodhek Road, Nairobi', 300000, 'Active', now() - interval '10 days');

  INSERT INTO public.products (
    id, owner_id, sku, name, description, category, unit, cost_price, selling_price,
    stock_quantity, status
  ) VALUES
    (p1, p_owner, 'CEM-001', 'Portland Cement 50kg', 'General purpose Portland cement for concrete and masonry.', 'Cement', 'bag', 640, 720, 450, 'Active'),
    (p2, p_owner, 'CEM-002', 'Rapid Hardening Cement 50kg', 'Fast-setting cement for early-strength applications.', 'Cement', 'bag', 700, 790, 120, 'Active'),
    (p3, p_owner, 'STL-001', 'Y12 Deformed Bar (12m)', 'High-yield reinforcement bar, 12 mm diameter.', 'Steel', 'piece', 1050, 1180, 300, 'Active'),
    (p4, p_owner, 'STL-002', 'Y16 Deformed Bar (12m)', 'High-yield reinforcement bar, 16 mm diameter.', 'Steel', 'piece', 1850, 2050, 18, 'Active'),
    (p5, p_owner, 'AGG-001', 'Building Sand', 'Washed river sand for plastering and blocks.', 'Aggregates', 'ton', 1800, 2200, 80, 'Active'),
    (p6, p_owner, 'AGG-002', '3/4" Ballast', 'Crushed stone ballast for structural concrete.', 'Aggregates', 'ton', 2300, 2800, 65, 'Active'),
    (p7, p_owner, 'PNT-001', 'Premium Emulsion Paint 20L', 'Durable interior matt emulsion, white.', 'Paint', 'litre', 5200, 6100, 40, 'Active'),
    (p8, p_owner, 'PNT-002', 'Weatherguard Exterior Paint 20L', 'Weather-resistant exterior finish.', 'Paint', 'litre', 6400, 7300, 0, 'Inactive');

  INSERT INTO public.inventory (owner_id, product_id, quantity_on_hand, quantity_reserved, reorder_level)
  VALUES
    (p_owner, p1, 450, 60, 100),
    (p_owner, p2, 120, 0, 50),
    (p_owner, p3, 300, 40, 80),
    (p_owner, p4, 18, 10, 40),
    (p_owner, p5, 80, 20, 30),
    (p_owner, p6, 65, 0, 30),
    (p_owner, p7, 40, 5, 15),
    (p_owner, p8, 0, 0, 10);

  INSERT INTO public.stock_movements
    (owner_id, product_id, movement_type, quantity, reason, notes, created_by, created_at)
  VALUES
    (p_owner, p1, 'stock_in', 500, 'Supplier delivery', 'Initial stock from supplier', p_owner, now() - interval '20 days'),
    (p_owner, p1, 'stock_out', 50, 'Damaged goods', 'Water damage in storage', p_owner, now() - interval '12 days'),
    (p_owner, p4, 'stock_in', 60, 'Supplier delivery', NULL, p_owner, now() - interval '15 days'),
    (p_owner, p4, 'stock_out', 42, 'Stock count correction', 'Cycle count variance', p_owner, now() - interval '3 days');

  INSERT INTO public.orders (
    id, owner_id, order_number, customer_id, status, total_amount, notes, created_at, updated_at,
    posted_at, processing_started_at, completed_at, canceled_at,
    created_by, created_by_name, updated_by, updated_by_name,
    posted_by, posted_by_name, processing_started_by, processing_started_by_name,
    completed_by, completed_by_name, canceled_by, canceled_by_name
  ) VALUES
    (o1, p_owner, 'ORD-' || stamp || '-1001', c1, 'Completed', 0, 'Foundation works, Phase 1.',
     now() - interval '25 days', now() - interval '18 days',
     now() - interval '25 days', now() - interval '23 days', now() - interval '18 days', NULL,
     p_owner, 'Amina Wanjiru', p_owner, 'Brian Otieno',
     p_owner, 'Amina Wanjiru', p_owner, 'Brian Otieno', p_owner, 'Brian Otieno', NULL, NULL),
    (o2, p_owner, 'ORD-' || stamp || '-1002', c3, 'Completed', 0, NULL,
     now() - interval '14 days', now() - interval '9 days',
     now() - interval '14 days', now() - interval '12 days', now() - interval '9 days', NULL,
     p_owner, 'Faith Njeri', p_owner, 'Brian Otieno',
     p_owner, 'Faith Njeri', p_owner, 'Brian Otieno', p_owner, 'Brian Otieno', NULL, NULL),
    (o3, p_owner, 'ORD-' || stamp || '-1003', c1, 'Processing', 0, 'Deliver to site gate B.',
     now() - interval '4 days', now() - interval '1 day',
     now() - interval '4 days', now() - interval '1 day', NULL, NULL,
     p_owner, 'Amina Wanjiru', p_owner, 'Brian Otieno',
     p_owner, 'Amina Wanjiru', p_owner, 'Brian Otieno', NULL, NULL, NULL, NULL),
    (o4, p_owner, 'ORD-' || stamp || '-1004', c2, 'Pending', 0, NULL,
     now() - interval '2 days', now() - interval '2 days',
     now() - interval '2 days', NULL, NULL, NULL,
     p_owner, 'Faith Njeri', p_owner, 'Faith Njeri',
     p_owner, 'Faith Njeri', NULL, NULL, NULL, NULL, NULL, NULL),
    (o5, p_owner, 'ORD-' || stamp || '-1005', c5, 'Draft', 0, 'Awaiting colour confirmation.',
     now() - interval '1 day', now() - interval '1 day',
     NULL, NULL, NULL, NULL,
     p_owner, 'Faith Njeri', p_owner, 'Faith Njeri',
     NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (o6, p_owner, 'ORD-' || stamp || '-1006', c4, 'Canceled', 0, 'Customer account suspended.',
     now() - interval '8 days', now() - interval '6 days',
     now() - interval '8 days', NULL, NULL, now() - interval '6 days',
     p_owner, 'Amina Wanjiru', p_owner, 'Brian Otieno',
     p_owner, 'Amina Wanjiru', NULL, NULL, NULL, NULL, p_owner, 'Brian Otieno');

  INSERT INTO public.order_items (
    owner_id, order_id, product_id, sku, product_name, unit, quantity, unit_price, discount, line_total
  ) VALUES
    (p_owner, o1, p1, 'CEM-001', 'Portland Cement 50kg', 'bag', 200, 720, 4000, 140000),
    (p_owner, o1, p3, 'STL-001', 'Y12 Deformed Bar (12m)', 'piece', 100, 1180, 0, 118000),
    (p_owner, o2, p5, 'AGG-001', 'Building Sand', 'ton', 30, 2200, 0, 66000),
    (p_owner, o2, p6, 'AGG-002', '3/4" Ballast', 'ton', 25, 2800, 2000, 68000),
    (p_owner, o3, p4, 'STL-002', 'Y16 Deformed Bar (12m)', 'piece', 10, 2050, 0, 20500),
    (p_owner, o3, p1, 'CEM-001', 'Portland Cement 50kg', 'bag', 60, 720, 0, 43200),
    (p_owner, o4, p7, 'PNT-001', 'Premium Emulsion Paint 20L', 'litre', 5, 6100, 500, 30000),
    (p_owner, o5, p7, 'PNT-001', 'Premium Emulsion Paint 20L', 'litre', 8, 6100, 0, 48800),
    (p_owner, o6, p2, 'CEM-002', 'Rapid Hardening Cement 50kg', 'bag', 80, 790, 0, 63200);

  UPDATE public.orders o
  SET total_amount = COALESCE((SELECT sum(line_total) FROM public.order_items i WHERE i.order_id = o.id), 0)
  WHERE o.owner_id = p_owner;

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, is_read)
  VALUES
    (p_owner, 'Welcome to the demo', 'This is a sandbox workspace. Create, edit and delete anything.', 'system', NULL, NULL, false),
    (p_owner, 'Order Processing', 'Order ORD-' || stamp || '-1003 is now being processed.', 'order', 'order', o3, false),
    (p_owner, 'Low stock', 'Y16 Deformed Bar (12m) is below its reorder level.', 'inventory', 'product', p4, false);

  PERFORM set_config('app.seeding', 'off', true);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. New-user hook: profile + seeded workspace
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.email, ''),
      'Demo Visitor'
    ),
    'Admin'
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.seed_demo_data(NEW.id);

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 8. Reset my demo data
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid := auth.uid();
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.notifications WHERE user_id = v_owner;
  DELETE FROM public.order_items WHERE owner_id = v_owner;
  DELETE FROM public.orders WHERE owner_id = v_owner;
  DELETE FROM public.stock_movements WHERE owner_id = v_owner;
  DELETE FROM public.inventory WHERE owner_id = v_owner;
  DELETE FROM public.products WHERE owner_id = v_owner;
  DELETE FROM public.customers WHERE owner_id = v_owner;

  PERFORM public.seed_demo_data(v_owner);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 9. Cleanup of expired anonymous visitors
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  expired uuid[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}')
  INTO expired
  FROM auth.users
  WHERE is_anonymous AND created_at < now() - interval '24 hours';

  DELETE FROM public.notifications WHERE user_id = ANY (expired);
  DELETE FROM public.order_items WHERE owner_id = ANY (expired);
  DELETE FROM public.orders WHERE owner_id = ANY (expired);
  DELETE FROM public.stock_movements WHERE owner_id = ANY (expired);
  DELETE FROM public.inventory WHERE owner_id = ANY (expired);
  DELETE FROM public.products WHERE owner_id = ANY (expired);
  DELETE FROM public.customers WHERE owner_id = ANY (expired);
  DELETE FROM auth.users WHERE id = ANY (expired);
END;
$function$;

REVOKE ALL ON FUNCTION public.seed_demo_data(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_demo_data() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_demo_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;
REVOKE ALL ON FUNCTION public.adjust_stock(uuid, text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, text, numeric, text, text) TO authenticated;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule(
    'cleanup-demo-data',
    '0 * * * *',
    'SELECT public.cleanup_demo_data()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not scheduled (%). Enable the extension and schedule public.cleanup_demo_data() hourly.', SQLERRM;
END
$$;

-- ---------------------------------------------------------------------------
-- 10. Storage for customer images (small images, own customers only)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-images', 'customer-images', true, 2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

CREATE POLICY customer_images_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'customer-images'
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY customer_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'customer-images'
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = (SELECT auth.uid())
    )
  );
