-- Table privileges for the Data API. Row level security (see demo_mode) still
-- limits which rows each signed-in user can read or change.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.customers,
  public.products,
  public.inventory,
  public.stock_movements,
  public.orders,
  public.order_items,
  public.notifications
TO authenticated;
