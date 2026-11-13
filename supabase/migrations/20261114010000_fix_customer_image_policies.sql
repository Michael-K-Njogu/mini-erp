-- Customer folders are <customer id>/logo-<uuid>.<extension>.
-- Qualify the object name so it cannot resolve to customers.name inside EXISTS.
-- Production uses shared customers; demo workspaces additionally have owner_id.
DO $$
DECLARE
  ownership_check text := '';
  customer_check text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'owner_id'
  ) THEN
    ownership_check := ' AND c.owner_id = (SELECT auth.uid())';
  END IF;

  -- This lookup also respects the caller's existing customer SELECT RLS policies.
  customer_check := 'EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]'
    || ownership_check || ')';

  DROP POLICY IF EXISTS customer_images_insert ON storage.objects;
  EXECUTE 'CREATE POLICY customer_images_insert ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
      bucket_id = ''customer-images''
      AND NOT COALESCE((SELECT (auth.jwt() ->> ''is_anonymous'')::boolean), false)
      AND EXISTS (SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.role IN (''Admin'', ''Sales''))
      AND ' || customer_check || ')';

  DROP POLICY IF EXISTS customer_images_delete ON storage.objects;
  EXECUTE 'CREATE POLICY customer_images_delete ON storage.objects
    FOR DELETE TO authenticated USING (
      bucket_id = ''customer-images''
      AND EXISTS (SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.role IN (''Admin'', ''Sales''))
      AND ' || customer_check || ')';

  -- Storage removal also needs SELECT permission on object metadata.
  DROP POLICY IF EXISTS customer_images_select ON storage.objects;
  EXECUTE 'CREATE POLICY customer_images_select ON storage.objects
    FOR SELECT TO authenticated USING (
      bucket_id = ''customer-images'' AND ' || customer_check || ')';
END
$$;
-- Existing restrictive policies remain in effect.
