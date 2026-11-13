CREATE TABLE public.product_tour_completions (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  completed_version integer NOT NULL CHECK (completed_version > 0)
);

ALTER TABLE public.product_tour_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_tour_completions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_tour_completions TO authenticated;

CREATE POLICY product_tour_own ON public.product_tour_completions
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Reset both the workspace and its tour state in the same transaction.
-- The existing demo reset function must be installed in the demo project.
CREATE OR REPLACE FUNCTION public.reset_demo_data_with_tour()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'An anonymous demo session is required';
  END IF;

  PERFORM public.reset_demo_data();
  DELETE FROM public.product_tour_completions WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_data_with_tour() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_demo_data_with_tour() TO authenticated;
