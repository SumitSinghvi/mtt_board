-- ==============================================================================
-- MTT Board - Link cards (tasks) to customers by ID
--
-- NON-DESTRUCTIVE: nothing is deleted or overwritten.
--   * Backs up customers + card contact fields first.
--   * Adds tasks.customer_id and fills it only where it is NULL.
--   * Creates customer rows only for card clients that have none.
--   * Card name/phone/email text is never changed by this migration.
-- Runs in one transaction: any error rolls everything back. Safe to re-run.
-- Run scripts/customer_link_dryrun.sql first to preview the result.
-- ==============================================================================

BEGIN;

-- 0. Backups (RLS on, no policies => not readable through the API)
CREATE TABLE IF NOT EXISTS public.backup_20261117_customers AS
  SELECT * FROM public.customers;
CREATE TABLE IF NOT EXISTS public.backup_20261117_task_customers AS
  SELECT id, customer_name, customer_phone, customer_email FROM public.tasks;
ALTER TABLE public.backup_20261117_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_20261117_task_customers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.backup_20261117_customers FROM anon, authenticated;
REVOKE ALL ON public.backup_20261117_task_customers FROM anon, authenticated;

-- 1. Link column. Deleting a customer only clears the link; the card keeps its text.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS customer_id text REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON public.tasks(customer_id);

-- 2. Phone key: last 10 digits ("+91 98290 11223" = "9829011223"). NULL if too short.
CREATE OR REPLACE FUNCTION public.phone_key(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 7
    THEN right(regexp_replace(p, '\D', '', 'g'), 10)
  END
$$;

-- 3. Backfill helpers (run twice: before and after creating missing customers)
CREATE OR REPLACE FUNCTION pg_temp.link_by_phone() RETURNS void LANGUAGE sql AS $$
  UPDATE public.tasks t
  SET customer_id = c.id
  FROM public.customers c
  WHERE t.customer_id IS NULL
    AND public.phone_key(t.customer_phone) IS NOT NULL
    AND public.phone_key(c.phone) = public.phone_key(t.customer_phone)
    AND (SELECT count(*) FROM public.customers c2
         WHERE public.phone_key(c2.phone) = public.phone_key(t.customer_phone)) = 1;
$$;

-- Name match only when exactly one customer has the name AND phones don't contradict.
CREATE OR REPLACE FUNCTION pg_temp.link_by_name() RETURNS void LANGUAGE sql AS $$
  UPDATE public.tasks t
  SET customer_id = c.id
  FROM public.customers c
  WHERE t.customer_id IS NULL
    AND coalesce(trim(t.customer_name), '') <> ''
    AND lower(trim(c.name)) = lower(trim(t.customer_name))
    AND (SELECT count(*) FROM public.customers c2
         WHERE lower(trim(c2.name)) = lower(trim(t.customer_name))) = 1
    AND (public.phone_key(t.customer_phone) IS NULL
         OR public.phone_key(c.phone) IS NULL
         OR public.phone_key(c.phone) = public.phone_key(t.customer_phone));
$$;

SELECT pg_temp.link_by_phone();
SELECT pg_temp.link_by_name();

-- 4. Create a customer for each card client not in the directory at all
--    (one per phone, or per name when no phone; latest card's contact wins).
INSERT INTO public.customers (id, name, phone, email)
SELECT DISTINCT ON (coalesce(public.phone_key(t.customer_phone), 'n:' || lower(trim(t.customer_name))))
  'cust-' || gen_random_uuid()::text,
  trim(t.customer_name),
  NULLIF(trim(t.customer_phone), ''),
  NULLIF(trim(t.customer_email), '')
FROM public.tasks t
WHERE t.customer_id IS NULL
  AND coalesce(trim(t.customer_name), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM public.customers c
                  WHERE public.phone_key(t.customer_phone) IS NOT NULL
                    AND public.phone_key(c.phone) = public.phone_key(t.customer_phone))
  AND NOT EXISTS (SELECT 1 FROM public.customers c
                  WHERE lower(trim(c.name)) = lower(trim(t.customer_name)))
ORDER BY coalesce(public.phone_key(t.customer_phone), 'n:' || lower(trim(t.customer_name))),
         t.created_at DESC NULLS LAST;

SELECT pg_temp.link_by_phone();
SELECT pg_temp.link_by_name();

-- 5. Keep card contact copies in sync when a customer is edited.
--    COALESCE: clearing a customer's phone/email never blanks the card's copy.
CREATE OR REPLACE FUNCTION public.sync_customer_to_tasks()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tasks
  SET customer_name  = NEW.name,
      customer_phone = coalesce(NEW.phone, customer_phone),
      customer_email = coalesce(NEW.email, customer_email)
  WHERE customer_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_to_tasks ON public.customers;
CREATE TRIGGER trg_sync_customer_to_tasks
AFTER UPDATE OF name, phone, email ON public.customers
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name
   OR OLD.phone IS DISTINCT FROM NEW.phone
   OR OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_customer_to_tasks();

COMMIT;

-- 6. Report: cards with a client name still unlinked (ambiguous; link them in the app).
SELECT id, customer_name, customer_phone
FROM public.tasks
WHERE customer_id IS NULL AND coalesce(trim(customer_name), '') <> ''
ORDER BY customer_name;
