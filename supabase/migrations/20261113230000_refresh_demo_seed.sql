-- DEMO PROJECT ONLY. Apply after 20261113220000_inventory_integration.sql.
-- Replaces the seed used by new demo visitors and workspace resets.
BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.seed_demo_data_before_inventory_integration(uuid)') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'owner_id'
     ) THEN
    RAISE EXCEPTION 'This demo seed requires the demo schema and inventory integration migration';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_demo_data(p_owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  stamp text := to_char(now(), 'YYMMDD');
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  p5 uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid();
  o2 uuid := gen_random_uuid();
  o3 uuid := gen_random_uuid();
  o4 uuid := gen_random_uuid();
  o5 uuid := gen_random_uuid();
  actor_name text;
BEGIN
  SELECT coalesce(nullif(btrim(display_name), ''), 'Demo Visitor')
    INTO actor_name FROM public.profiles WHERE id = p_owner;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demo profile not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.customers WHERE owner_id = p_owner)
     OR EXISTS (SELECT 1 FROM public.products WHERE owner_id = p_owner)
     OR EXISTS (SELECT 1 FROM public.inventory WHERE owner_id = p_owner)
     OR EXISTS (SELECT 1 FROM public.stock_movements WHERE owner_id = p_owner)
     OR EXISTS (SELECT 1 FROM public.orders WHERE owner_id = p_owner)
     OR EXISTS (SELECT 1 FROM public.order_items WHERE owner_id = p_owner)
     OR EXISTS (SELECT 1 FROM public.notifications WHERE user_id = p_owner) THEN
    RAISE EXCEPTION 'Demo workspace is not empty; reset it before seeding';
  END IF;

  PERFORM set_config('app.seeding', 'on', true);

  INSERT INTO public.customers (
    id, owner_id, customer_number, name, email, customer_type, sector, region, city,
    vat_number, contact_person, phone_primary, delivery_address, credit_limit,
    credit_status, created_at
  ) VALUES
    (c1, p_owner, 'CUST-' || stamp || '-0001', 'Acacia Construction', 'orders@acacia.example',
     'project', 'Real Estate', 'Nairobi', 'Nairobi', 'P051230001A', 'Mary Wambui',
     '0710000001', 'Industrial Area, Nairobi', 1500000, 'Active', now() - interval '65 days'),
    (c2, p_owner, 'CUST-' || stamp || '-0002', 'Rift Valley Hardware', 'sales@riftvalley.example',
     'wholesale', 'Manufacturing', 'Nakuru', 'Nakuru', 'P051230002A', 'David Kiptoo',
     '0710000002', 'Nakuru Town', 500000, 'Active', now() - interval '40 days'),
    (c3, p_owner, 'CUST-' || stamp || '-0003', 'Coastal Renovations', 'hello@coastal.example',
     'retail', 'Real Estate', 'Mombasa', 'Mombasa', 'P051230003A', 'Aisha Ali',
     '0710000003', 'Nyali, Mombasa', 250000, 'Active', now() - interval '12 days');

  INSERT INTO public.products (
    id, owner_id, sku, name, description, category, unit, cost_price, selling_price,
    stock_quantity, status, created_at
  ) VALUES
    (p1, p_owner, 'CEM-101', 'General Purpose Cement 50kg', 'Cement for general construction.',
     'Cement', 'bag', 640, 750, 180, 'Active', now() - interval '60 days'),
    (p2, p_owner, 'STL-101', 'Steel Reinforcement Bar 12mm', 'Twelve metre reinforcement bar.',
     'Steel', 'piece', 1000, 1200, 50, 'Active', now() - interval '55 days'),
    (p3, p_owner, 'AGG-101', 'Washed Building Sand', 'Washed sand sold by weight.',
     'Aggregates', 'ton', 1700, 2200, 8.5, 'Active', now() - interval '50 days'),
    (p4, p_owner, 'PNT-101', 'White Interior Paint', 'Water-based interior paint.',
     'Paint', 'litre', 300, 450, 0, 'Active', now() - interval '45 days'),
    (p5, p_owner, 'AGG-102', 'Crushed Ballast', 'Aggregate for concrete.',
     'Aggregates', 'ton', 2000, 2700, 25, 'Active', now() - interval '35 days');

  INSERT INTO public.inventory (owner_id, product_id, quantity_on_hand, quantity_reserved, reorder_level)
  VALUES
    (p_owner, p1, 180, 30, 50),
    (p_owner, p2, 50, 45, 10),
    (p_owner, p3, 8.5, 3.5, 6),
    (p_owner, p4, 0, 0, 5),
    (p_owner, p5, 25, 0, 8);

  INSERT INTO public.orders (
    id, owner_id, order_number, customer_id, status, total_amount, notes,
    created_at, updated_at, posted_at, processing_started_at, completed_at, canceled_at,
    created_by, created_by_name, updated_by, updated_by_name, posted_by, posted_by_name,
    processing_started_by, processing_started_by_name, completed_by, completed_by_name,
    canceled_by, canceled_by_name
  ) VALUES
    (o1, p_owner, 'ORD-' || stamp || '-1001', c1, 'Completed', 83500, 'Delivered to site.',
     now() - interval '20 days', now() - interval '14 days', now() - interval '19 days',
     now() - interval '17 days', now() - interval '14 days', NULL,
     p_owner, actor_name, p_owner, actor_name, p_owner, actor_name,
     p_owner, actor_name, p_owner, actor_name, NULL, NULL),
    (o2, p_owner, 'ORD-' || stamp || '-1002', c2, 'Pending', 31700, 'Awaiting dispatch.',
     now() - interval '5 days', now() - interval '4 days', now() - interval '4 days',
     NULL, NULL, NULL, p_owner, actor_name, p_owner, actor_name, p_owner, actor_name,
     NULL, NULL, NULL, NULL, NULL, NULL),
    (o3, p_owner, 'ORD-' || stamp || '-1003', c1, 'Processing', 52500, 'Preparing delivery.',
     now() - interval '4 days', now() - interval '1 day', now() - interval '3 days',
     now() - interval '1 day', NULL, NULL,
     p_owner, actor_name, p_owner, actor_name, p_owner, actor_name,
     p_owner, actor_name, NULL, NULL, NULL, NULL),
    (o4, p_owner, 'ORD-' || stamp || '-1004', c3, 'Draft', 5400, 'Quantity to be confirmed.',
     now() - interval '1 day', now() - interval '1 day', NULL, NULL, NULL, NULL,
     p_owner, actor_name, p_owner, actor_name, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (o5, p_owner, 'ORD-' || stamp || '-1005', c3, 'Canceled', 8100, 'Delivery no longer needed.',
     now() - interval '10 days', now() - interval '8 days', now() - interval '9 days',
     NULL, NULL, now() - interval '8 days', p_owner, actor_name, p_owner, actor_name,
     p_owner, actor_name, NULL, NULL, NULL, NULL, p_owner, actor_name);

  INSERT INTO public.order_items (
    owner_id, order_id, product_id, sku, product_name, unit, quantity, unit_price, discount, line_total
  ) VALUES
    (p_owner, o1, p1, 'CEM-101', 'General Purpose Cement 50kg', 'bag', 60, 750, 0, 45000),
    (p_owner, o1, p2, 'STL-101', 'Steel Reinforcement Bar 12mm', 'piece', 20, 1200, 0, 24000),
    (p_owner, o1, p3, 'AGG-101', 'Washed Building Sand', 'ton', 2.5, 2200, 0, 5500),
    (p_owner, o1, p4, 'PNT-101', 'White Interior Paint', 'litre', 20, 450, 0, 9000),
    (p_owner, o2, p2, 'STL-101', 'Steel Reinforcement Bar 12mm', 'piece', 20, 1200, 0, 24000),
    (p_owner, o2, p3, 'AGG-101', 'Washed Building Sand', 'ton', 3.5, 2200, 0, 7700),
    (p_owner, o3, p1, 'CEM-101', 'General Purpose Cement 50kg', 'bag', 30, 750, 0, 22500),
    (p_owner, o3, p2, 'STL-101', 'Steel Reinforcement Bar 12mm', 'piece', 25, 1200, 0, 30000),
    (p_owner, o4, p5, 'AGG-102', 'Crushed Ballast', 'ton', 2, 2700, 0, 5400),
    (p_owner, o5, p5, 'AGG-102', 'Crushed Ballast', 'ton', 3, 2700, 0, 8100);

  INSERT INTO public.stock_movements (
    owner_id, product_id, movement_type, quantity, reference_type, reference_id,
    reason, created_by, created_at
  ) VALUES
    (p_owner, p1, 'stock_in', 240, NULL, NULL, 'Supplier delivery', p_owner, now() - interval '30 days'),
    (p_owner, p2, 'stock_in', 70, NULL, NULL, 'Supplier delivery', p_owner, now() - interval '30 days'),
    (p_owner, p3, 'stock_in', 11, NULL, NULL, 'Supplier delivery', p_owner, now() - interval '30 days'),
    (p_owner, p4, 'stock_in', 20, NULL, NULL, 'Supplier delivery', p_owner, now() - interval '30 days'),
    (p_owner, p5, 'stock_in', 25, NULL, NULL, 'Supplier delivery', p_owner, now() - interval '30 days'),
    (p_owner, p1, 'stock_out', 60, 'order', o1, 'Order completed', p_owner, now() - interval '14 days'),
    (p_owner, p2, 'stock_out', 20, 'order', o1, 'Order completed', p_owner, now() - interval '14 days'),
    (p_owner, p3, 'stock_out', 2.5, 'order', o1, 'Order completed', p_owner, now() - interval '14 days'),
    (p_owner, p4, 'stock_out', 20, 'order', o1, 'Order completed', p_owner, now() - interval '14 days');

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, is_read)
  VALUES
    (p_owner, 'Welcome to the demo', 'Explore your sample workspace or reset it at any time.',
     'system', NULL, NULL, false),
    (p_owner, 'Order processing', 'A sample order is being prepared for delivery.',
     'order', 'order', o3, false),
    (p_owner, 'Low stock', 'Steel reinforcement bar is below its reorder level.',
     'inventory', 'product', p2, false);

  PERFORM set_config('app.seeding', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.seed_demo_data(uuid) FROM PUBLIC, anon, authenticated;
COMMIT;
