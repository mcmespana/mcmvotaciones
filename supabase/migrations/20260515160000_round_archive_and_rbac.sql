-- Add archive support and RBAC RPCs for rounds

-- 1. Add columns
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS is_archived  boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at  timestamptz;

-- 2. Index: exclude archived from default queries
CREATE INDEX IF NOT EXISTS rounds_not_archived_idx
  ON public.rounds (created_at DESC)
  WHERE is_archived = false;

-- 3. RPC: archive_round (admin + super_admin)
CREATE OR REPLACE FUNCTION public.archive_round(p_id uuid, p_archived boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  SELECT role INTO v_role
    FROM public.admin_users
    WHERE id = auth.uid();

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.rounds
    SET is_archived = p_archived,
        archived_at = CASE WHEN p_archived THEN now() ELSE NULL END,
        updated_at  = now()
    WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_round(uuid, boolean) TO authenticated;

-- 4. RPC: delete_round (super_admin only — hard delete with cascade)
CREATE OR REPLACE FUNCTION public.delete_round(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  SELECT role INTO v_role
    FROM public.admin_users
    WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can delete rounds';
  END IF;

  -- Delete in dependency order
  DELETE FROM public.round_results      WHERE round_id = p_id;
  DELETE FROM public.vote_history       WHERE round_id = p_id;
  DELETE FROM public.round_participants WHERE round_id = p_id;
  DELETE FROM public.seats              WHERE round_id = p_id;
  DELETE FROM public.votes              WHERE round_id = p_id;
  DELETE FROM public.candidates         WHERE round_id = p_id;
  DELETE FROM public.rounds             WHERE id       = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_round(uuid) TO authenticated;
