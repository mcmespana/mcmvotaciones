-- Adds duplicate_round RPC: copies a round's config + candidates into a new
-- clean-state draft. Votes, seats, results, and history are never copied.

CREATE OR REPLACE FUNCTION public.duplicate_round(
  p_source_id              uuid,
  p_new_title              text,
  p_preserve_candidate_state boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id   uuid;
  v_new_code text;
  v_new_slug text;
  v_attempt  int := 0;
  v_alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
  -- Generate a unique 4-char access code (same alphabet as client generateAccessCode)
  LOOP
    SELECT string_agg(
      substr(v_alphabet, (floor(random() * 36)::int) + 1, 1),
      ''
    )
    INTO v_new_code
    FROM generate_series(1, 4);

    EXIT WHEN NOT EXISTS (SELECT 1 FROM rounds WHERE access_code = v_new_code);

    v_attempt := v_attempt + 1;
    IF v_attempt > 100 THEN
      RAISE EXCEPTION 'duplicate_round: could not generate a unique access_code after 100 attempts';
    END IF;
  END LOOP;

  -- Insert the duplicated round, resetting all runtime/state columns to defaults
  INSERT INTO rounds (
    title,                         description,
    year,                          team,
    max_votantes,                  census_mode,
    max_votes_per_round,           max_selected_candidates,
    voting_type_id,                voting_type_name,
    access_code,
    -- state → always clean draft
    is_active,                     is_closed,
    is_archived,                   archived_at,
    is_voting_open,                join_locked,
    round_finalized,               show_results_to_voters,
    show_ballot_summary_projection,show_final_gallery_projection,
    public_candidates_enabled,
    show_ballot_animation,         ballot_animation_started_at,
    current_round_number,          votes_current_round,
    selected_candidates_count,
    created_at,                    updated_at
  )
  SELECT
    p_new_title,                   description,
    year,                          team,
    max_votantes,                  census_mode,
    max_votes_per_round,           max_selected_candidates,
    voting_type_id,                voting_type_name,
    v_new_code,
    -- reset
    false, false,
    false, null,
    false, false,
    false, false,
    false, false,
    false,
    false, null,
    1, 0,
    0,
    now(), now()
  FROM rounds
  WHERE id = p_source_id
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    RAISE EXCEPTION 'duplicate_round: source round % not found', p_source_id;
  END IF;

  -- Generate slug (simplified: no Unicode normalisation, good enough for uniqueness)
  v_new_slug :=
    regexp_replace(lower(p_new_title), '[^a-z0-9]+', '-', 'g');
  v_new_slug := regexp_replace(v_new_slug, '^-+|-+$', '', 'g');
  v_new_slug := substring(v_new_slug, 1, 54)
                || '-'
                || substring(replace(v_new_id::text, '-', ''), 1, 6);

  UPDATE rounds SET slug = v_new_slug WHERE id = v_new_id;

  -- Copy candidates; optionally preserve is_eliminated / is_selected state
  INSERT INTO candidates (
    round_id,
    name,                surname,               location,
    group_name,          age,                   description,
    image_url,           order_index,
    crm_id,              dni,                   birthdate,
    etapa,               asamblea_movimiento_es, asamblea_responsabilidad,
    monitor_desde,       monitor_de,             grupo_mcm,
    crm_source,          crm_relationship_types,
    is_eliminated,       elimination_round,
    is_selected,         selected_in_round,     selected_vote_count,
    created_at,          updated_at
  )
  SELECT
    v_new_id,
    name,                surname,               location,
    group_name,          age,                   description,
    image_url,           order_index,
    crm_id,              dni,                   birthdate,
    etapa,               asamblea_movimiento_es, asamblea_responsabilidad,
    monitor_desde,       monitor_de,             grupo_mcm,
    crm_source,          crm_relationship_types,
    CASE WHEN p_preserve_candidate_state THEN is_eliminated  ELSE false END,
    CASE WHEN p_preserve_candidate_state THEN elimination_round ELSE null END,
    CASE WHEN p_preserve_candidate_state THEN is_selected    ELSE false END,
    CASE WHEN p_preserve_candidate_state THEN selected_in_round ELSE null END,
    CASE WHEN p_preserve_candidate_state THEN selected_vote_count ELSE null END,
    now(),               now()
  FROM candidates
  WHERE round_id = p_source_id;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.duplicate_round IS
  'Creates a clean-state copy of a round. Config + candidates are copied; votes, seats, results and history are NOT. A fresh access_code and slug are always generated.';
