-- Self-service profile fields. Role and identity remain administrator-managed.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS avatar_path text;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
DO $$
DECLARE
  col record;
BEGIN
  FOR col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
  LOOP
    EXECUTE format('REVOKE UPDATE (%I) ON public.profiles FROM PUBLIC, anon, authenticated', col.column_name);
  END LOOP;
END;
$$;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, phone_number, avatar_path) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- This restriction also applies if another permissive UPDATE policy exists.
DROP POLICY IF EXISTS profiles_update_own_restriction ON public.profiles;
CREATE POLICY profiles_update_own_restriction ON public.profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user = 'authenticated' AND (
    NEW.id IS DISTINCT FROM OLD.id OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.updated_at IS DISTINCT FROM OLD.updated_at
  ) THEN
    RAISE EXCEPTION 'Profile identity, role and timestamps cannot be changed directly';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_00_guard_identity ON public.profiles;
CREATE TRIGGER profiles_00_guard_identity BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_identity();

CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.display_name IS NULL OR length(btrim(NEW.display_name)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Display name must contain 1 to 100 characters';
  END IF;
  IF NEW.phone_number IS NOT NULL AND (
    length(NEW.phone_number) > 30 OR NEW.phone_number !~ '^[+0-9(). -]+$'
  ) THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;
  IF NEW.avatar_path IS NOT NULL AND (
    split_part(NEW.avatar_path, '/', 1) <> NEW.id::text
    OR NEW.avatar_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  ) THEN
    RAISE EXCEPTION 'Invalid profile image path';
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validate_self_service_update ON public.profiles;
CREATE TRIGGER profiles_validate_self_service_update
  BEFORE UPDATE OF display_name, phone_number, avatar_path ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_update();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images', 'profile-images', false, 2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

CREATE POLICY profile_images_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-images');

-- Demo accounts expire automatically; their uploads are disabled because SQL
-- deletion of storage metadata does not remove the underlying object.
CREATE POLICY profile_images_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images'
    AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  );

CREATE POLICY profile_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Existing broad storage policies must not bypass these bucket restrictions.
CREATE POLICY profile_images_read_restriction ON storage.objects
  AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (bucket_id <> 'profile-images' OR (SELECT auth.uid()) IS NOT NULL);
CREATE POLICY profile_images_insert_restriction ON storage.objects
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id <> 'profile-images'
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    )
  );
CREATE POLICY profile_images_delete_restriction ON storage.objects
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (
    bucket_id <> 'profile-images'
    OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
CREATE POLICY profile_images_update_restriction ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id <> 'profile-images')
  WITH CHECK (bucket_id <> 'profile-images');

-- Retain historical names; capture the profile name for future order actions.
CREATE OR REPLACE FUNCTION public.set_order_actor_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  actor_id uuid := COALESCE(auth.uid(), NULLIF(to_jsonb(NEW) ->> 'owner_id', '')::uuid);
  actor_name text;
BEGIN
  IF current_setting('app.seeding', true) = 'on' THEN
    RETURN NEW;
  END IF;

  actor_name := COALESCE(
    (SELECT NULLIF(btrim(display_name), '') FROM public.profiles WHERE id = actor_id),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    NULLIF(auth.jwt() ->> 'email', ''),
    actor_id::text,
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
      NEW.posted_by := actor_id; NEW.posted_by_name := actor_name;
    END IF;
    IF NEW.processing_started_at IS NOT NULL THEN
      NEW.processing_started_by := actor_id; NEW.processing_started_by_name := actor_name;
    END IF;
    IF NEW.completed_at IS NOT NULL THEN
      NEW.completed_by := actor_id; NEW.completed_by_name := actor_name;
    END IF;
    IF NEW.canceled_at IS NOT NULL THEN
      NEW.canceled_by := actor_id; NEW.canceled_by_name := actor_name;
    END IF;
  ELSE
    IF (NEW.posted_at IS DISTINCT FROM OLD.posted_at AND NEW.posted_at IS NOT NULL)
       OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'Pending') THEN
      NEW.posted_by := actor_id; NEW.posted_by_name := actor_name;
    END IF;
    IF (NEW.processing_started_at IS DISTINCT FROM OLD.processing_started_at AND NEW.processing_started_at IS NOT NULL)
       OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'Processing') THEN
      NEW.processing_started_by := actor_id; NEW.processing_started_by_name := actor_name;
    END IF;
    IF (NEW.completed_at IS DISTINCT FROM OLD.completed_at AND NEW.completed_at IS NOT NULL)
       OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'Completed') THEN
      NEW.completed_by := actor_id; NEW.completed_by_name := actor_name;
    END IF;
    IF (NEW.canceled_at IS DISTINCT FROM OLD.canceled_at AND NEW.canceled_at IS NOT NULL)
       OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'Canceled') THEN
      NEW.canceled_by := actor_id; NEW.canceled_by_name := actor_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
