-- ==============================================================================
-- MTT Board - Staff Presence, Session & Per-Page Duration Tracking
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.staff_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    duration_seconds integer NOT NULL DEFAULT 0,
    user_agent text,
    current_page text
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_user_id ON public.staff_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_started_at ON public.staff_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_last_seen_at ON public.staff_sessions(last_seen_at DESC);

ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_sessions_select" ON public.staff_sessions;
CREATE POLICY "staff_sessions_select"
ON public.staff_sessions FOR SELECT TO authenticated
USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "staff_sessions_insert" ON public.staff_sessions;
CREATE POLICY "staff_sessions_insert"
ON public.staff_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "staff_sessions_update" ON public.staff_sessions;
CREATE POLICY "staff_sessions_update"
ON public.staff_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "staff_sessions_delete" ON public.staff_sessions;
CREATE POLICY "staff_sessions_delete"
ON public.staff_sessions FOR DELETE TO authenticated
USING (public.is_admin());

-- Per-page visit duration tracking
CREATE TABLE IF NOT EXISTS public.staff_page_visits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.staff_sessions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    page text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    duration_seconds integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_staff_page_visits_session_id ON public.staff_page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_staff_page_visits_user_id ON public.staff_page_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_page_visits_started_at ON public.staff_page_visits(started_at DESC);

ALTER TABLE public.staff_page_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_page_visits_select" ON public.staff_page_visits;
CREATE POLICY "staff_page_visits_select"
ON public.staff_page_visits FOR SELECT TO authenticated
USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "staff_page_visits_insert" ON public.staff_page_visits;
CREATE POLICY "staff_page_visits_insert"
ON public.staff_page_visits FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "staff_page_visits_update" ON public.staff_page_visits;
CREATE POLICY "staff_page_visits_update"
ON public.staff_page_visits FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.record_staff_heartbeat(
    p_session_id uuid DEFAULT NULL,
    p_user_agent text DEFAULT NULL,
    p_current_page text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_ret_id uuid;
    v_active_visit_id uuid;
    v_active_visit_page text;
    v_clean_page text := COALESCE(NULLIF(TRIM(p_current_page), ''), 'Dashboard');
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_session_id IS NOT NULL THEN
        UPDATE public.staff_sessions
        SET 
            last_seen_at = now(),
            duration_seconds = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (now() - started_at))))::integer,
            current_page = v_clean_page
        WHERE id = p_session_id AND user_id = v_user_id AND ended_at IS NULL
        RETURNING id INTO v_ret_id;
    END IF;

    IF v_ret_id IS NULL THEN
        INSERT INTO public.staff_sessions (user_id, started_at, last_seen_at, duration_seconds, user_agent, current_page)
        VALUES (v_user_id, now(), now(), 0, p_user_agent, v_clean_page)
        RETURNING id INTO v_ret_id;
    END IF;

    -- Manage per-page visit entry
    SELECT id, page INTO v_active_visit_id, v_active_visit_page
    FROM public.staff_page_visits
    WHERE session_id = v_ret_id AND user_id = v_user_id AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_active_visit_id IS NOT NULL THEN
        IF v_active_visit_page = v_clean_page THEN
            UPDATE public.staff_page_visits
            SET 
                last_seen_at = now(),
                duration_seconds = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (now() - started_at))))::integer
            WHERE id = v_active_visit_id;
        ELSE
            UPDATE public.staff_page_visits
            SET 
                ended_at = now(),
                last_seen_at = now(),
                duration_seconds = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (now() - started_at))))::integer
            WHERE id = v_active_visit_id;

            INSERT INTO public.staff_page_visits (session_id, user_id, page, started_at, last_seen_at, duration_seconds)
            VALUES (v_ret_id, v_user_id, v_clean_page, now(), now(), 0);
        END IF;
    ELSE
        INSERT INTO public.staff_page_visits (session_id, user_id, page, started_at, last_seen_at, duration_seconds)
        VALUES (v_ret_id, v_user_id, v_clean_page, now(), now(), 0);
    END IF;

    RETURN v_ret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_staff_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL OR p_session_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE public.staff_sessions
    SET 
        ended_at = now(),
        last_seen_at = now(),
        duration_seconds = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (now() - started_at))))::integer
    WHERE id = p_session_id AND user_id = v_user_id;

    UPDATE public.staff_page_visits
    SET 
        ended_at = now(),
        last_seen_at = now(),
        duration_seconds = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (now() - started_at))))::integer
    WHERE session_id = p_session_id AND user_id = v_user_id AND ended_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_staff_heartbeat(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_staff_session(uuid) TO authenticated;
