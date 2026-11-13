-- Apply to both projects only after reviewing the preflight queries in README.md.
-- All checks and changes are transactional.
BEGIN;

LOCK TABLE public.products, public.inventory, public.orders, public.order_items,
  public.stock_movements IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.products p JOIN public.inventory i ON i.product_id = p.id
    WHERE i.quantity_on_hand IS DISTINCT FROM p.stock_quantity
      OR to_jsonb(i)->>'owner_id' IS DISTINCT FROM to_jsonb(p)->>'owner_id'
  ) THEN
    RAISE EXCEPTION 'Inventory migration stopped: product and inventory stock balances differ';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.inventory
    WHERE quantity_on_hand IS NULL OR quantity_reserved IS NULL
      OR quantity_on_hand < 0 OR quantity_reserved < 0
      OR quantity_on_hand IN ('NaN'::numeric, 'Infinity'::numeric)
      OR quantity_reserved IN ('NaN'::numeric, 'Infinity'::numeric)
      OR quantity_reserved > quantity_on_hand
  ) OR EXISTS (SELECT 1 FROM public.products WHERE stock_quantity IS NULL OR stock_quantity < 0
    OR stock_quantity::numeric IN ('NaN'::numeric, 'Infinity'::numeric)) THEN
    RAISE EXCEPTION 'Inventory migration stopped: invalid stock balances require review';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
    WHERE o.status IN ('Pending', 'Processing')
      AND (oi.quantity IS NULL OR oi.quantity <= 0
        OR oi.quantity IN ('NaN'::numeric, 'Infinity'::numeric))
  ) THEN
    RAISE EXCEPTION 'Inventory migration stopped: open orders contain invalid quantities';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.products p
    LEFT JOIN public.inventory i ON i.product_id = p.id
    LEFT JOIN (
      SELECT oi.product_id, sum(oi.quantity) AS reserved
      FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
      WHERE o.status IN ('Pending', 'Processing')
      GROUP BY oi.product_id
    ) r ON r.product_id = p.id
    WHERE coalesce(i.quantity_reserved, 0) <> coalesce(r.reserved, 0)
  ) THEN
    RAISE EXCEPTION 'Inventory migration stopped: reserved balances differ from open orders';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    JOIN public.products p ON p.id = oi.product_id
    WHERE o.status IN ('Pending', 'Processing')
      AND to_jsonb(o)->>'owner_id' IS DISTINCT FROM to_jsonb(p)->>'owner_id'
  ) THEN
    RAISE EXCEPTION 'Inventory migration stopped: open order and product owners differ';
  END IF;
END;
$$;

-- Orders and adjustments support fractional quantities; product stock must not round them.
ALTER TABLE public.products ALTER COLUMN stock_quantity TYPE numeric USING stock_quantity::numeric;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'owner_id') THEN
    EXECUTE 'INSERT INTO public.inventory (product_id, quantity_on_hand, quantity_reserved, reorder_level, owner_id)
      SELECT p.id, p.stock_quantity, 0, 0, p.owner_id
      FROM public.products p WHERE NOT EXISTS (SELECT 1 FROM public.inventory i WHERE i.product_id = p.id)';
  ELSE
    INSERT INTO public.inventory (product_id, quantity_on_hand, quantity_reserved, reorder_level)
    SELECT p.id, p.stock_quantity, 0, 0 FROM public.products p
    WHERE NOT EXISTS (SELECT 1 FROM public.inventory i WHERE i.product_id = p.id);
  END IF;
END;
$$;

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_valid_balances CHECK (
    quantity_on_hand IS NOT NULL AND quantity_reserved IS NOT NULL
    AND quantity_on_hand >= 0 AND quantity_reserved >= 0
    AND quantity_on_hand NOT IN ('NaN'::numeric, 'Infinity'::numeric)
    AND quantity_reserved NOT IN ('NaN'::numeric, 'Infinity'::numeric)
    AND quantity_reserved <= quantity_on_hand
  );

-- Direct balance changes would bypass the movement and reservation invariants.
REVOKE INSERT, UPDATE, DELETE ON public.inventory, public.stock_movements FROM PUBLIC, anon, authenticated;
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('inventory', 'stock_movements')
  LOOP
    EXECUTE format('REVOKE INSERT (%I), UPDATE (%I) ON public.%I FROM PUBLIC, anon, authenticated',
      c.column_name, c.column_name, c.table_name);
  END LOOP;
END;
$$;

CREATE POLICY inventory_role_view ON public.inventory AS RESTRICTIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Sales', 'Operations')));
CREATE POLICY stock_movements_role_view ON public.stock_movements AS RESTRICTIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Sales', 'Operations')));

CREATE OR REPLACE FUNCTION public.inventory_create_for_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF current_setting('app.seeding', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.stock_quantity IS NULL OR NEW.stock_quantity < 0
    OR NEW.stock_quantity IN ('NaN'::numeric, 'Infinity'::numeric) THEN
    RAISE EXCEPTION 'Opening stock must be nonnegative';
  END IF;
  IF NEW.stock_quantity > 0 AND auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Operations')
  ) THEN
    RAISE EXCEPTION 'Not authorized to set opening stock';
  END IF;
  IF to_jsonb(NEW) ? 'owner_id' THEN
    EXECUTE 'INSERT INTO public.inventory (product_id, quantity_on_hand, quantity_reserved, reorder_level, owner_id)
      VALUES ($1, $2, 0, 0, $3)'
      USING NEW.id, NEW.stock_quantity, (to_jsonb(NEW)->>'owner_id')::uuid;
  ELSE
    INSERT INTO public.inventory (product_id, quantity_on_hand, quantity_reserved, reorder_level)
      VALUES (NEW.id, NEW.stock_quantity, 0, 0);
  END IF;
  IF NEW.stock_quantity > 0 AND auth.uid() IS NOT NULL THEN
    IF to_jsonb(NEW) ? 'owner_id' THEN
      EXECUTE 'INSERT INTO public.stock_movements
        (product_id, movement_type, quantity, reason, created_by, owner_id)
        VALUES ($1, ''stock_in'', $2, ''Opening stock'', $3, $4)'
        USING NEW.id, NEW.stock_quantity, auth.uid(), (to_jsonb(NEW)->>'owner_id')::uuid;
    ELSE
      INSERT INTO public.stock_movements (product_id, movement_type, quantity, reason, created_by)
        VALUES (NEW.id, 'stock_in', NEW.stock_quantity, 'Opening stock', auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_create_for_product AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.inventory_create_for_product();

CREATE OR REPLACE FUNCTION public.inventory_guard_product_stock()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user = 'authenticated' AND NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity THEN
    RAISE EXCEPTION 'Change stock through an inventory adjustment';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_guard_product_stock BEFORE UPDATE OF stock_quantity ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.inventory_guard_product_stock();

CREATE OR REPLACE FUNCTION public.inventory_sync_product_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.products SET stock_quantity = NEW.quantity_on_hand WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_sync_product_stock AFTER UPDATE OF quantity_on_hand ON public.inventory
  FOR EACH ROW WHEN (OLD.quantity_on_hand IS DISTINCT FROM NEW.quantity_on_hand)
  EXECUTE FUNCTION public.inventory_sync_product_stock();

CREATE OR REPLACE FUNCTION public.inventory_remove_empty_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_inventory public.inventory%ROWTYPE;
BEGIN
  SELECT * INTO v_inventory FROM public.inventory WHERE product_id = OLD.id FOR UPDATE;
  IF FOUND THEN
    IF v_inventory.quantity_on_hand <> 0 OR v_inventory.quantity_reserved <> 0 THEN
      RAISE EXCEPTION 'Cannot delete a product with stock or reservations';
    END IF;
    IF EXISTS (SELECT 1 FROM public.stock_movements WHERE product_id = OLD.id) THEN
      RAISE EXCEPTION 'Cannot delete a product with stock movement history';
    END IF;
    DELETE FROM public.inventory WHERE id = v_inventory.id;
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER inventory_remove_empty_product BEFORE DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.inventory_remove_empty_product();

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id uuid, p_movement_type text, p_quantity numeric, p_reason text, p_notes text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_inventory public.inventory%ROWTYPE;
  v_new_quantity numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Operations')
  ) THEN RAISE EXCEPTION 'Not authorized to adjust stock'; END IF;
  IF p_movement_type IS NULL OR p_movement_type NOT IN ('stock_in', 'stock_out')
     OR p_quantity IS NULL OR p_quantity <= 0
     OR p_quantity IN ('NaN'::numeric, 'Infinity'::numeric)
     OR NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A valid movement type, positive quantity and reason are required';
  END IF;
  SELECT * INTO v_inventory FROM public.inventory i
    WHERE i.product_id = p_product_id
      AND (to_jsonb(i)->>'owner_id' IS NULL OR to_jsonb(i)->>'owner_id' = auth.uid()::text)
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory record not found'; END IF;
  v_new_quantity := v_inventory.quantity_on_hand
    + CASE WHEN p_movement_type = 'stock_in' THEN p_quantity ELSE -p_quantity END;
  IF v_new_quantity < v_inventory.quantity_reserved THEN
    RAISE EXCEPTION 'Insufficient available stock';
  END IF;
  UPDATE public.inventory SET quantity_on_hand = v_new_quantity, updated_at = now()
    WHERE id = v_inventory.id;
  IF to_jsonb(v_inventory) ? 'owner_id' THEN
    EXECUTE 'INSERT INTO public.stock_movements
      (product_id, movement_type, quantity, reason, notes, created_by, owner_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)'
      USING p_product_id, p_movement_type, p_quantity, btrim(p_reason), p_notes,
        auth.uid(), (to_jsonb(v_inventory)->>'owner_id')::uuid;
  ELSE
    INSERT INTO public.stock_movements (product_id, movement_type, quantity, reason, notes, created_by)
      VALUES (p_product_id, p_movement_type, p_quantity, btrim(p_reason), p_notes, auth.uid());
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_stock(uuid, text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, text, numeric, text, text) TO authenticated;

-- Lock the order when modifying its items so posting cannot race with edits.
CREATE OR REPLACE FUNCTION public.inventory_guard_order_item()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_status text;
  v_order_id uuid;
BEGIN
  IF current_user <> 'authenticated' THEN RETURN coalesce(NEW, OLD); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Sales')) THEN
    RAISE EXCEPTION 'Not authorized to edit order items';
  END IF;
  v_order_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.order_id ELSE NEW.order_id END;
  IF TG_OP = 'UPDATE' AND NEW.order_id IS DISTINCT FROM OLD.order_id THEN
    RAISE EXCEPTION 'Order items cannot be moved between orders';
  END IF;
  SELECT status INTO v_status FROM public.orders WHERE id = v_order_id FOR UPDATE;
  IF NOT FOUND AND TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
  IF NOT FOUND OR v_status <> 'Draft' THEN
    RAISE EXCEPTION 'Only draft orders can be edited';
  END IF;
  IF TG_OP <> 'DELETE' THEN
    IF NEW.quantity IS NULL OR NEW.quantity <= 0
      OR NEW.quantity IN ('NaN'::numeric, 'Infinity'::numeric) THEN
      RAISE EXCEPTION 'Order quantity must be greater than zero';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id) THEN
      RAISE EXCEPTION 'Product not found';
    END IF;
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;
CREATE TRIGGER inventory_guard_order_item BEFORE INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.inventory_guard_order_item();

CREATE OR REPLACE FUNCTION public.inventory_guard_order_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF OLD.status <> 'Draft' THEN RAISE EXCEPTION 'Only draft orders can be deleted'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin') THEN
      RAISE EXCEPTION 'Not authorized to delete orders';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER inventory_guard_order_delete BEFORE DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.inventory_guard_order_delete();

CREATE OR REPLACE FUNCTION public.inventory_guard_order_edit()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user <> 'authenticated' THEN RETURN NEW; END IF;
  IF OLD.status <> 'Draft' THEN
    IF NEW.order_number IS DISTINCT FROM OLD.order_number
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR NEW.notes IS DISTINCT FROM OLD.notes
      OR NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
      RAISE EXCEPTION 'Only draft orders can be edited';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Sales')) THEN
    RAISE EXCEPTION 'Not authorized to edit draft orders';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_guard_order_edit BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.inventory_guard_order_edit();

CREATE OR REPLACE FUNCTION public.inventory_order_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_role text;
  v_item record;
  v_inventory public.inventory%ROWTYPE;
  v_product_name text;
BEGIN
  IF current_setting('app.seeding', true) = 'on' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'Draft' THEN RAISE EXCEPTION 'New orders must start as drafts'; END IF;
    IF auth.uid() IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Sales')
    ) THEN RAISE EXCEPTION 'Not authorized to create orders'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF NOT (
    (OLD.status = 'Draft' AND NEW.status = 'Pending' AND v_role IN ('Admin', 'Sales'))
    OR (OLD.status = 'Pending' AND NEW.status = 'Processing' AND v_role IN ('Admin', 'Sales', 'Operations'))
    OR (OLD.status = 'Processing' AND NEW.status = 'Completed' AND v_role IN ('Admin', 'Operations'))
    OR (OLD.status IN ('Pending', 'Processing') AND NEW.status = 'Canceled'
      AND v_role IN ('Admin', 'Sales', 'Operations'))
  ) IS TRUE THEN
    RAISE EXCEPTION 'Order transition is not permitted';
  END IF;
  IF OLD.status = 'Draft' AND NOT EXISTS (
    SELECT 1 FROM public.order_items WHERE order_id = NEW.id
  ) THEN RAISE EXCEPTION 'Add at least one item before posting an order'; END IF;

  IF NEW.status IN ('Pending', 'Completed', 'Canceled') THEN
    FOR v_item IN
      SELECT product_id, sum(quantity) AS quantity
      FROM public.order_items WHERE order_id = NEW.id GROUP BY product_id ORDER BY product_id
    LOOP
      IF v_item.quantity IS NULL OR v_item.quantity <= 0
        OR v_item.quantity IN ('NaN'::numeric, 'Infinity'::numeric) THEN
        RAISE EXCEPTION 'Invalid order quantity';
      END IF;
      SELECT * INTO v_inventory FROM public.inventory i
        WHERE i.product_id = v_item.product_id
          AND to_jsonb(i)->>'owner_id' IS NOT DISTINCT FROM to_jsonb(NEW)->>'owner_id'
        FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Inventory record not found for product %', v_item.product_id; END IF;
      IF NEW.status = 'Pending' THEN
        IF v_inventory.quantity_on_hand - v_inventory.quantity_reserved < v_item.quantity THEN
          SELECT name INTO v_product_name FROM public.products WHERE id = v_item.product_id;
          RAISE EXCEPTION 'Insufficient available stock for % (available: %, requested: %)',
            coalesce(v_product_name, v_item.product_id::text),
            v_inventory.quantity_on_hand - v_inventory.quantity_reserved, v_item.quantity;
        END IF;
        UPDATE public.inventory SET quantity_reserved = quantity_reserved + v_item.quantity, updated_at = now()
          WHERE id = v_inventory.id;
      ELSE
        IF v_inventory.quantity_reserved < v_item.quantity THEN
          RAISE EXCEPTION 'Insufficient reserved stock for product %', v_item.product_id;
        END IF;
        UPDATE public.inventory SET
          quantity_reserved = quantity_reserved - v_item.quantity,
          quantity_on_hand = quantity_on_hand - CASE WHEN NEW.status = 'Completed' THEN v_item.quantity ELSE 0 END,
          updated_at = now() WHERE id = v_inventory.id;
        IF NEW.status = 'Completed' THEN
          IF to_jsonb(v_inventory) ? 'owner_id' THEN
            EXECUTE 'INSERT INTO public.stock_movements
              (product_id, movement_type, quantity, reference_type, reference_id, reason, created_by, owner_id)
              VALUES ($1, ''stock_out'', $2, ''order'', $3, ''Order completed'', $4, $5)'
              USING v_item.product_id, v_item.quantity, NEW.id, auth.uid(),
                (to_jsonb(v_inventory)->>'owner_id')::uuid;
          ELSE
            INSERT INTO public.stock_movements
              (product_id, movement_type, quantity, reference_type, reference_id, reason, created_by)
              VALUES (v_item.product_id, 'stock_out', v_item.quantity, 'order', NEW.id, 'Order completed', auth.uid());
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  IF NEW.status = 'Pending' THEN NEW.posted_at := coalesce(NEW.posted_at, now()); END IF;
  IF NEW.status = 'Processing' THEN NEW.processing_started_at := coalesce(NEW.processing_started_at, now()); END IF;
  IF NEW.status = 'Completed' THEN NEW.completed_at := coalesce(NEW.completed_at, now()); END IF;
  IF NEW.status = 'Canceled' THEN NEW.canceled_at := coalesce(NEW.canceled_at, now()); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_order_transition BEFORE INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.inventory_order_transition();

-- Save the draft and post it in the same transaction. RLS applies to
-- the caller; the stock transition above executes with its own narrow privileges.
CREATE OR REPLACE FUNCTION public.save_order_with_items(
  p_order_id uuid, p_order_number text, p_customer_id uuid, p_notes text,
  p_items jsonb, p_post boolean
)
RETURNS public.orders LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role NOT IN ('Admin', 'Sales') OR v_role IS NULL THEN
    RAISE EXCEPTION 'Not authorized to save orders';
  END IF;
  IF p_post IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid order items';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  IF EXISTS (
    SELECT id FROM jsonb_to_recordset(p_items) AS x(id uuid)
    WHERE id IS NOT NULL GROUP BY id HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Duplicate order item'; END IF;
  IF p_order_id IS NULL THEN
    INSERT INTO public.orders (order_number, customer_id, notes, status)
      VALUES (p_order_number, p_customer_id, p_notes, 'Draft') RETURNING * INTO v_order;
  ELSE
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND OR v_order.status <> 'Draft' THEN
      RAISE EXCEPTION 'Only draft orders can be edited';
    END IF;
    UPDATE public.orders SET customer_id = p_customer_id, notes = p_notes
      WHERE id = p_order_id RETURNING * INTO v_order;
    DELETE FROM public.order_items oi WHERE oi.order_id = p_order_id
      AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id uuid) WHERE x.id = oi.id);
  END IF;
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    id uuid, product_id uuid, sku text, product_name text, unit text, quantity numeric,
    unit_price numeric, discount numeric, line_total numeric, notes text
  ) LOOP
    IF v_item.id IS NULL THEN
      INSERT INTO public.order_items
        (order_id, product_id, sku, product_name, unit, quantity, unit_price, discount, line_total, notes)
      VALUES (v_order.id, v_item.product_id, v_item.sku, v_item.product_name, v_item.unit,
        v_item.quantity, v_item.unit_price, v_item.discount, v_item.line_total, v_item.notes);
    ELSE
      UPDATE public.order_items SET product_id = v_item.product_id, sku = v_item.sku,
        product_name = v_item.product_name, unit = v_item.unit, quantity = v_item.quantity,
        unit_price = v_item.unit_price, discount = v_item.discount, line_total = v_item.line_total,
        notes = v_item.notes
      WHERE id = v_item.id AND order_id = v_order.id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Order item not found'; END IF;
    END IF;
  END LOOP;
  UPDATE public.orders SET
    total_amount = coalesce((SELECT sum(line_total) FROM public.order_items WHERE order_id = v_order.id), 0),
    status = CASE WHEN p_post THEN 'Pending' ELSE 'Draft' END
    WHERE id = v_order.id RETURNING * INTO v_order;
  RETURN v_order;
END;
$$;
REVOKE ALL ON FUNCTION public.save_order_with_items(uuid, text, uuid, text, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_order_with_items(uuid, text, uuid, text, jsonb, boolean) TO authenticated;

-- The original demo seed contains illustrative reservations unrelated to orders.
-- Keep it intact and reconcile newly seeded workspaces after it has finished.
DO $$
BEGIN
  IF to_regprocedure('public.seed_demo_data(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.seed_demo_data(uuid) RENAME TO seed_demo_data_before_inventory_integration;
    EXECUTE $function$
      CREATE FUNCTION public.seed_demo_data(p_owner uuid)
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
      BEGIN
        PERFORM public.seed_demo_data_before_inventory_integration(p_owner);
        UPDATE public.inventory i SET quantity_reserved = coalesce((
          SELECT sum(oi.quantity) FROM public.order_items oi
          JOIN public.orders o ON o.id = oi.order_id
          WHERE oi.product_id = i.product_id AND o.status IN ('Pending', 'Processing')
        ), 0) WHERE i.owner_id = p_owner;
      END;
      $body$
    $function$;
    REVOKE ALL ON FUNCTION public.seed_demo_data(uuid) FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
