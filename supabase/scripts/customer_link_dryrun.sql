-- ==============================================================================
-- MTT Board - Customer link DRY RUN (read-only, changes nothing)
-- Run this BEFORE migrations/20261117_customer_link.sql and review the numbers.
-- ==============================================================================

WITH t AS (
  SELECT
    id,
    customer_name,
    NULLIF(right(regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g'), 10), '') AS pkey,
    lower(trim(customer_name)) AS nkey
  FROM public.tasks
  WHERE coalesce(trim(customer_name), '') <> ''
),
c AS (
  SELECT
    id,
    NULLIF(right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10), '') AS pkey,
    lower(trim(name)) AS nkey
  FROM public.customers
),
m AS (
  SELECT
    t.id,
    t.customer_name,
    (SELECT count(*) FROM c WHERE t.pkey IS NOT NULL AND length(t.pkey) >= 7 AND c.pkey = t.pkey) AS phone_matches,
    (SELECT count(*) FROM c WHERE c.nkey = t.nkey) AS name_matches
  FROM t
)
SELECT
  CASE
    WHEN phone_matches = 1 THEN '1. will link by phone'
    WHEN phone_matches > 1 THEN '4. AMBIGUOUS: several customers share this phone (left unlinked)'
    WHEN name_matches = 1 THEN '2. will link by name (if phones do not conflict)'
    WHEN name_matches > 1 THEN '4. AMBIGUOUS: several customers share this name (left unlinked)'
    ELSE '3. no customer yet: will create one, then link'
  END AS outcome,
  count(*) AS cards,
  string_agg(DISTINCT customer_name, ', ') FILTER (WHERE phone_matches > 1 OR (phone_matches = 0 AND name_matches > 1)) AS ambiguous_names
FROM m
GROUP BY 1
ORDER BY 1;
