-- ==============================================================================
-- Fix Tasks Delete RLS Policy: Support multi-assignees, case-insensitivity & permissions
-- ==============================================================================

DROP POLICY IF EXISTS "tasks_delete_authorized" ON public.tasks;

CREATE POLICY "tasks_delete_authorized"
ON public.tasks FOR DELETE TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (
      p.role = 'admin' OR
      lower(trim(coalesce(tasks.created_by, ''))) = lower(trim(p.name)) OR
      lower(trim(coalesce(tasks.created_by, ''))) = lower(trim(p.email)) OR
      lower(trim(coalesce(tasks.created_by, ''))) = lower(trim(split_part(p.email, '@', 1))) OR
      lower(trim(coalesce(tasks.assignee, ''))) = lower(trim(p.name)) OR
      lower(trim(coalesce(tasks.assignee, ''))) = lower(trim(p.email)) OR
      lower(trim(p.name)) = ANY(SELECT lower(trim(a)) FROM unnest(tasks.assignees) a) OR
      lower(trim(p.email)) = ANY(SELECT lower(trim(a)) FROM unnest(tasks.assignees) a) OR
      (p.permissions->>'canDeleteCards')::boolean = true
    )
  )
);
