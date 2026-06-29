-- =============================================================================
-- Lock down public.admin_users
-- -----------------------------------------------------------------------------
-- Before: RLS policy "Allow all admin user operations" FOR ALL TO public
-- USING (true), plus table-level GRANTs to anon/authenticated. Net effect:
-- anyone holding the public anon key could SELECT password_hash + PII, and
-- INSERT/UPDATE/DELETE every row straight from the browser.
--
-- After: anon/authenticated have NO direct access to the table. All admin-user
-- operations the app needs go through SECURITY DEFINER RPCs that (a) never
-- expose password_hash and (b) verify the caller is a super_admin server-side.
--
-- NOTE: auth in this app is application-level (bcrypt + localStorage, no JWT),
-- so the RPCs authorize on a caller-supplied actor id. Because the table is no
-- longer readable by anon, actor ids are no longer enumerable. A fully robust
-- model would require real session tokens (Supabase Auth / JWT) — tracked
-- separately. This migration closes the reported world-readable hole.
-- =============================================================================

-- 1. Drop the permissive policy and revoke direct table access ----------------
DROP POLICY IF EXISTS "Allow all admin user operations" ON public.admin_users;

REVOKE ALL ON public.admin_users FROM anon;
REVOKE ALL ON public.admin_users FROM authenticated;

-- RLS stays enabled; with no policy + no grants, anon/authenticated are denied.
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Helper: is the given actor a super_admin? --------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin(p_actor_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = p_actor_id AND role = 'super_admin'
  );
$$;

-- 3. List admin users (no password_hash) --------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_users(p_actor_id uuid)
RETURNS TABLE(id uuid, username text, email text, name text,
              role public.user_role, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_super_admin(p_actor_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT au.id, au.username, au.email, au.name, au.role, au.created_at
  FROM public.admin_users au
  ORDER BY au.created_at DESC;
END;
$$;

-- 4. Create an admin user -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_actor_id uuid,
  p_username text,
  p_password text,
  p_name     text,
  p_email    text,
  p_role     text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_count integer;
  v_new_id uuid;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM public.admin_users;

  -- Allow the very first user to bootstrap; afterwards require super_admin.
  IF v_user_count > 0 AND NOT public.is_super_admin(p_actor_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  BEGIN
    INSERT INTO public.admin_users (username, password_hash, name, email, role)
    VALUES (p_username, p_password, p_name, p_email, p_role::public.user_role)
    RETURNING id INTO v_new_id;
  EXCEPTION WHEN unique_violation THEN
    IF SQLERRM ILIKE '%username%' THEN
      RAISE EXCEPTION 'username_taken';
    ELSIF SQLERRM ILIKE '%email%' THEN
      RAISE EXCEPTION 'email_taken';
    ELSE
      RAISE;
    END IF;
  END;

  RETURN v_new_id;
END;
$$;

-- 5. Change an admin user's password ------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_change_password(
  p_actor_id  uuid,
  p_target_id uuid,
  p_new_password text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_super_admin(p_actor_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.admin_users
  SET password_hash = p_new_password  -- hashed by hash_password_trigger
  WHERE id = p_target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
END;
$$;

-- 6. Grants: only the RPCs are callable by the client -------------------------
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.admin_list_users(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_list_users(uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_create_user(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_create_user(uuid, text, text, text, text, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_change_password(uuid, uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_change_password(uuid, uuid, text) TO anon, authenticated;
