# MTT Board - Database Security & RLS Guide

## Applying Security & RLS Migration

To enforce database-level access control on Supabase:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (`eflwqmybzutiddnokljn`).
3. Navigate to **SQL Editor**.
4. Open or paste the contents of [`migrations/20261012_security_rls.sql`](./migrations/20261012_security_rls.sql).
5. Click **Run**.

## What this secures:

- **Profiles**: Protects `role`, `status`, and `permissions` against client-side elevation. Non-admins cannot alter their role.
- **Boards & Columns**: Restricts board creation, deletion, column modifications, and archiving to verified administrators.
- **Tasks**: Permits task updates and deletions only to authorized operators (Admins, task creators, or assigned personnel).
- **Customers**: Restricts customer deletion to administrators.
- **Staff Todos**: Enforces strict row isolation (`user_id = auth.uid()`), ensuring personal notes cannot be read or manipulated by other accounts.
- **Administrative RPCs**: Hardens `create_staff_user`, `update_staff_profile`, `update_staff_password`, and `delete_staff_user` with `public.is_admin()` checks.
