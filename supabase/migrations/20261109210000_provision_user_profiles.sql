-- Refuse to install alongside unknown auth-user INSERT triggers: they may
-- also provision profiles and could conflict with this trigger.
DO $$
DECLARE
  unexpected_triggers text;
BEGIN
  SELECT string_agg(t.tgname, ', ' ORDER BY t.tgname)
  INTO unexpected_triggers
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
  JOIN pg_catalog.pg_namespace pn ON pn.oid = p.pronamespace
  WHERE n.nspname = 'auth' AND c.relname = 'users'
    AND NOT t.tgisinternal AND (t.tgtype & 4) = 4
    AND NOT (
      t.tgname = 'on_auth_user_created'
      AND pn.nspname = 'public' AND p.proname = 'handle_new_user'
      AND to_regprocedure('public.seed_demo_data(uuid)') IS NOT NULL
    )
    AND NOT (
      t.tgname = 'zz_provision_user_profile'
      AND pn.nspname = 'public' AND p.proname = 'provision_user_profile'
    );

  IF unexpected_triggers IS NOT NULL THEN
    RAISE EXCEPTION 'Review existing auth.users INSERT triggers before installing profile provisioning: %', unexpected_triggers;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(NEW.is_anonymous, false) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    left(COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(btrim(NEW.email), ''),
      'User'
    ), 100),
    'Sales'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_user_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_provision_user_profile ON auth.users;
CREATE TRIGGER zz_provision_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.provision_user_profile();
