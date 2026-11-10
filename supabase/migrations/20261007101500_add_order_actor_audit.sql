ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_by_name text,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by_name text,
  ADD COLUMN IF NOT EXISTS posted_by uuid,
  ADD COLUMN IF NOT EXISTS posted_by_name text,
  ADD COLUMN IF NOT EXISTS processing_started_by uuid,
  ADD COLUMN IF NOT EXISTS processing_started_by_name text,
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS completed_by_name text,
  ADD COLUMN IF NOT EXISTS canceled_by uuid,
  ADD COLUMN IF NOT EXISTS canceled_by_name text;

CREATE OR REPLACE FUNCTION public.set_order_actor_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_name text := COALESCE(
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    NULLIF(auth.jwt() ->> 'email', ''),
    actor_id::text
  );
BEGIN
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
$$;

DROP TRIGGER IF EXISTS orders_set_actor_audit ON public.orders;

CREATE TRIGGER orders_set_actor_audit
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_actor_audit();
