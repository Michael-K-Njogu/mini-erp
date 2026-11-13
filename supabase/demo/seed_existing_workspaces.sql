-- DEMO PROJECT ONLY. Run as a database administrator after applying
-- 20261113220000_inventory_integration.sql and
-- 20261113230000_refresh_demo_seed.sql.
-- All anonymous workspaces must be empty; any failure rolls back every seed.
BEGIN;

LOCK TABLE public.customers, public.products, public.inventory, public.stock_movements,
  public.orders, public.order_items, public.notifications IN SHARE ROW EXCLUSIVE MODE;

SELECT public.seed_demo_data(id)
FROM auth.users
WHERE is_anonymous = true;

COMMIT;
