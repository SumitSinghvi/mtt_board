-- ==============================================================================
-- MTT Board - Postgres Row Level Security (RLS) & RPC Hardening Migration
-- Target Project: eflwqmybzutiddnokljn
-- ==============================================================================

-- 0. Ensure extensions available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Helper Functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_sig
        FROM pg_proc
        WHERE proname IN ('is_admin', 'prevent_self_role_escalation')
        AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Profiles Table RLS & Role Tampering Protection
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;

CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "profiles_insert_self_or_admin"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin() OR (
    auth.uid() = id AND role = 'travel'
  )
);

CREATE POLICY "profiles_update_self_or_admin"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_admin() OR auth.uid() = id)
WITH CHECK (public.is_admin() OR auth.uid() = id);

CREATE POLICY "profiles_delete_admin_only"
ON public.profiles FOR DELETE TO authenticated
USING (public.is_admin());

-- Trigger to block non-admins from self-escalating role, permissions, status
DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_self_role_escalation() CASCADE;

CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify staff roles.';
    END IF;
    IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify staff permissions.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify staff account status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 3. Boards Table RLS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boards_select_authenticated" ON public.boards;
DROP POLICY IF EXISTS "boards_insert_admin_only" ON public.boards;
DROP POLICY IF EXISTS "boards_update_admin_only" ON public.boards;
DROP POLICY IF EXISTS "boards_delete_admin_only" ON public.boards;

CREATE POLICY "boards_select_authenticated"
ON public.boards FOR SELECT TO authenticated USING (true);

CREATE POLICY "boards_insert_admin_only"
ON public.boards FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "boards_update_admin_only"
ON public.boards FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "boards_delete_admin_only"
ON public.boards FOR DELETE TO authenticated USING (public.is_admin());

-- 4. Columns Table RLS
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "columns_select_authenticated" ON public.columns;
DROP POLICY IF EXISTS "columns_insert_admin_only" ON public.columns;
DROP POLICY IF EXISTS "columns_update_admin_only" ON public.columns;
DROP POLICY IF EXISTS "columns_delete_admin_only" ON public.columns;

CREATE POLICY "columns_select_authenticated"
ON public.columns FOR SELECT TO authenticated USING (true);

CREATE POLICY "columns_insert_admin_only"
ON public.columns FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "columns_update_admin_only"
ON public.columns FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "columns_delete_admin_only"
ON public.columns FOR DELETE TO authenticated USING (public.is_admin());

-- 5. Tasks Table RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_authorized" ON public.tasks;

CREATE POLICY "tasks_select_authenticated"
ON public.tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "tasks_insert_authenticated"
ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "tasks_update_authenticated"
ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "tasks_delete_authorized"
ON public.tasks FOR DELETE TO authenticated
USING (
  public.is_admin() OR
  created_by = (auth.jwt() ->> 'email') OR
  assignee = (auth.jwt() ->> 'email') OR
  created_by = (SELECT name FROM public.profiles WHERE id = auth.uid()) OR
  assignee = (SELECT name FROM public.profiles WHERE id = auth.uid())
);

-- 6. Customers Table RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_authenticated" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_authenticated" ON public.customers;
DROP POLICY IF EXISTS "customers_update_authenticated" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_admin_only" ON public.customers;

CREATE POLICY "customers_select_authenticated"
ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "customers_insert_authenticated"
ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "customers_update_authenticated"
ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "customers_delete_admin_only"
ON public.customers FOR DELETE TO authenticated USING (public.is_admin());

-- 7. Staff Todos Table RLS (User Isolation)
ALTER TABLE public.staff_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_todos_all_owner_only" ON public.staff_todos;

CREATE POLICY "staff_todos_all_owner_only"
ON public.staff_todos FOR ALL TO authenticated
USING (user_id::text = auth.uid()::text)
WITH CHECK (user_id::text = auth.uid()::text);

-- 8. Hardened Administrative RPCs

-- Drop ALL existing overloads of administrative functions dynamically
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_sig
        FROM pg_proc
        WHERE proname IN (
            'create_staff_user',
            'update_staff_profile',
            'update_staff_password',
            'delete_staff_user'
        )
        AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_staff_user(
  p_email text,
  p_password text,
  p_name text,
  p_phone text,
  p_role text,
  p_permissions jsonb DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
SET row_security = off
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can create staff accounts.';
  END IF;

  new_user_id := gen_random_uuid();

  INSERT INTO public.profiles (id, email, name, phone, role, status, permissions, created_at)
  VALUES (
    new_user_id,
    lower(trim(p_email)),
    trim(p_name),
    trim(p_phone),
    p_role,
    'active',
    p_permissions,
    now()
  );

  RETURN new_user_id::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_profile(
  p_staff_id text,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_permissions jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF auth.uid()::text <> p_staff_id THEN
      RAISE EXCEPTION 'Access Denied: You can only edit your own profile.';
    END IF;
    IF p_role IS NOT NULL OR p_permissions IS NOT NULL OR p_status IS NOT NULL THEN
      RAISE EXCEPTION 'Access Denied: Only administrators can edit roles, status, or permissions.';
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    name = COALESCE(p_name, name),
    phone = COALESCE(p_phone, phone),
    role = CASE WHEN public.is_admin() AND p_role IS NOT NULL THEN p_role ELSE role END,
    status = CASE WHEN public.is_admin() AND p_status IS NOT NULL THEN p_status ELSE status END,
    permissions = CASE WHEN public.is_admin() AND p_permissions IS NOT NULL THEN p_permissions ELSE permissions END
  WHERE id = p_staff_id::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_password(
  p_user_id text,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
SET row_security = off
AS $$
BEGIN
  IF NOT public.is_admin() AND auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot change another user''s password.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  WHERE id = p_user_id::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_staff_user(
  p_user_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can delete staff accounts.';
  END IF;

  DELETE FROM public.profiles WHERE id = p_user_id::uuid;
  DELETE FROM auth.users WHERE id = p_user_id::uuid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_staff_user FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_staff_user TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_staff_profile FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_staff_profile TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_staff_password FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_staff_password TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_staff_user FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_staff_user TO authenticated;
