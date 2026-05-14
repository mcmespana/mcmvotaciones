-- =============================================================================
-- BASELINE SCHEMA SNAPSHOT — mcmvotaciones
-- Generated: 2026-05-14 from Supabase project sjhxhsdckvungsrbquve (PG 17.6)
--
-- Purpose:
--   Reproduces the COMPLETE public schema on an empty Postgres instance.
--   Used to bootstrap new environments (dev, staging, alt prod).
--   Idempotent: safe to run multiple times on a fresh DB.
--
-- DO NOT EDIT after merge. If something must change, create a NEW migration
-- with timestamp YYYYMMDDHHMMSS_<desc>.sql in this folder.
--
-- DO NOT run this on the production DB — its schema is already tracked
-- by supabase_migrations.schema_migrations (10 prior migrations).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto    SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.team_type AS ENUM ('ECE', 'ECL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seat_status AS ENUM ('libre', 'ocupado', 'expirado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name          text NOT NULL,
  email         text UNIQUE NOT NULL,
  role          public.user_role DEFAULT 'admin',
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at    timestamptz NOT NULL DEFAULT timezone('utc', now())
);
COMMENT ON TABLE public.admin_users IS 'Admin users with bcrypt authentication - application-level access control';

CREATE TABLE IF NOT EXISTS public.voting_types (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text UNIQUE NOT NULL,
  max_selected_candidates  integer NOT NULL DEFAULT 1,
  max_votes_per_round      integer NOT NULL DEFAULT 0,
  census_mode              text NOT NULL DEFAULT 'maximum'
                           CHECK (census_mode IN ('maximum', 'exact')),
  is_system                boolean NOT NULL DEFAULT false,
  created_at               timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rounds (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                           text NOT NULL,
  description                     text,
  year                            integer NOT NULL,
  team                            public.team_type NOT NULL,
  max_votantes                    integer DEFAULT 0,
  is_active                       boolean DEFAULT false,
  is_closed                       boolean DEFAULT false,
  current_round_number            integer DEFAULT 1,
  max_votes_per_round             integer DEFAULT 3,
  max_selected_candidates         integer DEFAULT 6,
  selected_candidates_count       integer DEFAULT 0,
  created_at                      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at                      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  closed_at                       timestamptz,
  votes_current_round             integer DEFAULT 0,
  round_finalized                 boolean DEFAULT false,
  show_results_to_voters          boolean DEFAULT false,
  access_code                     text,
  census_mode                     text DEFAULT 'maximum'
                                  CHECK (census_mode IN ('maximum', 'exact')),
  is_voting_open                  boolean NOT NULL DEFAULT false,
  join_locked                     boolean NOT NULL DEFAULT false,
  show_ballot_summary_projection  boolean NOT NULL DEFAULT false,
  show_final_gallery_projection   boolean DEFAULT false,
  public_candidates_enabled       boolean DEFAULT false,
  slug                            text UNIQUE,
  voting_type_id                  uuid REFERENCES public.voting_types(id) ON DELETE SET NULL,
  voting_type_name                text
);
COMMENT ON TABLE public.rounds IS 'Voting rounds with permissive RLS: access control handled at application level';
COMMENT ON COLUMN public.rounds.max_votantes IS 'Número máximo de votantes (cupos) habilitados para esta ronda. Define el umbral de selección: ceil(0.5 * max_votantes)';

CREATE TABLE IF NOT EXISTS public.candidates (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id                    uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  name                        text NOT NULL,
  surname                     text NOT NULL,
  location                    text,
  group_name                  text,
  age                         integer,
  description                 text,
  image_url                   text,
  order_index                 integer DEFAULT 0,
  is_eliminated               boolean DEFAULT false,
  is_selected                 boolean DEFAULT false,
  elimination_round           integer,
  created_at                  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at                  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  crm_id                      text,
  dni                         text,
  birthdate                   date,
  etapa                       text,
  asamblea_movimiento_es      text,
  asamblea_responsabilidad    text,
  monitor_desde               text,
  monitor_de                  text,
  grupo_mcm                   text,
  crm_source                  text,
  crm_relationship_types      text,
  selected_in_round           integer,
  selected_vote_count         integer
);
COMMENT ON TABLE public.candidates IS 'Candidates with permissive RLS: access control handled at application level';

CREATE TABLE IF NOT EXISTS public.votes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id            uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  candidate_id        uuid REFERENCES public.candidates(id) ON DELETE CASCADE,
  device_hash         text NOT NULL,
  user_agent          text,
  ip_address          text,
  round_number        integer NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT timezone('utc', now()),
  seat_id             uuid,
  vote_hash           text,
  is_invalidated      boolean DEFAULT false,
  invalidation_reason text,
  invalidated_at      timestamptz,
  CONSTRAINT votes_round_device_candidate_unique UNIQUE (round_id, device_hash, round_number, candidate_id)
);
COMMENT ON TABLE public.votes IS 'Votes with permissive RLS: access control handled at application level';

CREATE TABLE IF NOT EXISTS public.seats (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id             uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  fingerprint_hash     text NOT NULL,
  browser_instance_id  text NOT NULL,
  user_agent           text,
  ip_address           text,
  joined_at            timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_seen_at         timestamptz NOT NULL DEFAULT timezone('utc', now()),
  estado               public.seat_status NOT NULL DEFAULT 'ocupado',
  created_at           timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at           timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT seats_round_id_fingerprint_hash_browser_instance_id_key UNIQUE (round_id, fingerprint_hash, browser_instance_id)
);
COMMENT ON TABLE public.seats IS 'Asientos (cupos) de votantes por ronda. Controla el acceso mediante fingerprinting de dispositivo y navegador.';

-- Wire votes.seat_id FK after seats exists
DO $$ BEGIN
  ALTER TABLE public.votes ADD CONSTRAINT votes_seat_id_fkey
    FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.round_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  round_number  integer NOT NULL,
  candidate_id  uuid REFERENCES public.candidates(id) ON DELETE CASCADE,
  vote_count    integer NOT NULL DEFAULT 0,
  is_visible    boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  percentage    numeric DEFAULT 0,
  CONSTRAINT round_results_round_id_round_number_candidate_id_key UNIQUE (round_id, round_number, candidate_id)
);

CREATE TABLE IF NOT EXISTS public.vote_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  total_votes integer NOT NULL,
  results     jsonb NOT NULL,
  exported_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  exported_by uuid REFERENCES public.admin_users(id),
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.round_participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  round_number  integer NOT NULL,
  candidate_id  uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT round_participants_round_id_round_number_candidate_id_key UNIQUE (round_id, round_number, candidate_id)
);

CREATE TABLE IF NOT EXISTS public.z_nopausasupabase (
  id         bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  num        numeric
);
COMMENT ON TABLE public.z_nopausasupabase IS 'Anti-pause table for Supabase Free Tier — never drop, written periodically to keep project active';

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_candidates_round       ON public.candidates(round_id, order_index);
CREATE INDEX IF NOT EXISTS idx_candidates_eliminated  ON public.candidates(round_id, is_eliminated, is_selected);
CREATE UNIQUE INDEX IF NOT EXISTS candidates_round_crm_id_uniq ON public.candidates(round_id, crm_id) WHERE crm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_votes_round            ON public.votes(round_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate        ON public.votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_device           ON public.votes(device_hash);
CREATE INDEX IF NOT EXISTS idx_votes_round_number     ON public.votes(round_id, round_number);
CREATE INDEX IF NOT EXISTS idx_votes_round_device_number ON public.votes(round_id, device_hash, round_number);
CREATE INDEX IF NOT EXISTS idx_votes_seat_id          ON public.votes(seat_id);
CREATE INDEX IF NOT EXISTS idx_votes_vote_hash        ON public.votes(vote_hash);

CREATE INDEX IF NOT EXISTS idx_seats_round_id         ON public.seats(round_id);
CREATE INDEX IF NOT EXISTS idx_seats_fingerprint      ON public.seats(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_seats_browser_instance ON public.seats(browser_instance_id);
CREATE INDEX IF NOT EXISTS idx_seats_estado           ON public.seats(round_id, estado);
CREATE INDEX IF NOT EXISTS idx_seats_last_seen        ON public.seats(last_seen_at) WHERE estado = 'ocupado';

CREATE INDEX IF NOT EXISTS idx_round_results          ON public.round_results(round_id, round_number);
CREATE INDEX IF NOT EXISTS idx_rounds_active          ON public.rounds(is_active, is_closed);
CREATE INDEX IF NOT EXISTS idx_round_participants     ON public.round_participants(round_id, round_number);

-- -----------------------------------------------------------------------------
-- Functions (full set from production, in dependency order)
-- Definitions are kept verbatim from pg_get_functiondef on 2026-05-14.
-- See docs/db/SCHEMA_AUDIT_2026-05-14.md for the search_path warning;
-- a separate cleanup migration will set search_path explicitly.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_password_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.password_hash IS NOT NULL AND NOT (NEW.password_hash ~ '^\$2[ayb]\$') THEN
    NEW.password_hash = extensions.crypt(NEW.password_hash, extensions.gen_salt('bf', 12));
  END IF;
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_first_super_admin()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.admin_users;
  IF user_count = 0 THEN NEW.role = 'super_admin'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.authenticate_admin(input_username text, input_password text)
RETURNS TABLE(id uuid, username text, email text, name text, role public.user_role, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.username, au.email, au.name, au.role, au.created_at, au.updated_at
  FROM public.admin_users au
  WHERE au.username = input_username
    AND au.password_hash = extensions.crypt(input_password, au.password_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unique_voters_count(p_round_id uuid, p_round_number integer)
RETURNS integer LANGUAGE plpgsql AS $$
BEGIN
  RETURN (SELECT COUNT(DISTINCT device_hash) FROM public.votes
          WHERE round_id = p_round_id AND round_number = p_round_number);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_votes_current_round()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rounds SET votes_current_round = get_unique_voters_count(NEW.round_id, NEW.round_number) WHERE id = NEW.round_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rounds SET votes_current_round = get_unique_voters_count(OLD.round_id, OLD.round_number) WHERE id = OLD.round_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_selection_threshold(p_max_votantes integer)
RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_max_votantes IS NULL OR p_max_votantes <= 0 THEN RETURN 1; END IF;
  RETURN FLOOR(p_max_votantes / 2.0)::INTEGER + 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_max_votes(p_round_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE remaining_candidates INTEGER; max_candidates INTEGER; selected_count INTEGER;
BEGIN
  SELECT max_selected_candidates, selected_candidates_count
    INTO max_candidates, selected_count
  FROM public.rounds WHERE id = p_round_id;
  remaining_candidates := max_candidates - selected_count;
  IF remaining_candidates >= 4 THEN RETURN 3;
  ELSIF remaining_candidates >= 2 THEN RETURN 2;
  ELSE RETURN 1; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_round_results_with_majority(p_round_id uuid, p_round_number integer)
RETURNS TABLE(candidate_id uuid, vote_count bigint, percentage numeric, has_absolute_majority boolean)
LANGUAGE plpgsql AS $$
DECLARE v_total_ballots INTEGER;
BEGIN
  SELECT COUNT(DISTINCT v.vote_hash)::INTEGER INTO v_total_ballots
  FROM public.votes v
  WHERE v.round_id = p_round_id AND v.round_number = p_round_number
    AND v.candidate_id IS NOT NULL AND COALESCE(v.is_invalidated, false) = false;
  RETURN QUERY
  SELECT v.candidate_id, COUNT(v.id) AS vote_count,
         CASE WHEN v_total_ballots > 0 THEN (COUNT(v.id)::NUMERIC / v_total_ballots::NUMERIC) * 100 ELSE 0 END,
         CASE WHEN v_total_ballots > 0 THEN (COUNT(v.id)::NUMERIC / v_total_ballots::NUMERIC) > 0.5 ELSE false END
  FROM public.votes v
  WHERE v.round_id = p_round_id AND v.round_number = p_round_number
    AND v.candidate_id IS NOT NULL AND COALESCE(v.is_invalidated, false) = false
  GROUP BY v.candidate_id ORDER BY vote_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_round_results(round_id uuid, round_number integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.round_results
  WHERE round_results.round_id = calculate_round_results.round_id
    AND round_results.round_number = calculate_round_results.round_number;
  INSERT INTO public.round_results (round_id, round_number, candidate_id, vote_count, is_visible)
  SELECT calculate_round_results.round_id, calculate_round_results.round_number, c.id,
         COALESCE(COUNT(v.id), 0)::INTEGER, false
  FROM public.candidates c
  LEFT JOIN public.votes v ON c.id = v.candidate_id AND c.round_id = v.round_id
    AND v.round_number = calculate_round_results.round_number
  WHERE c.round_id = calculate_round_results.round_id AND c.is_eliminated = false
  GROUP BY c.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_round_results(p_round_id uuid, p_round_number integer)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_result JSON;
BEGIN
  UPDATE public.candidates c
  SET is_selected = true, selected_in_round = p_round_number,
      selected_vote_count = results.vote_count::INTEGER, updated_at = NOW()
  FROM (SELECT candidate_id, has_absolute_majority, vote_count
        FROM public.calculate_round_results_with_majority(p_round_id, p_round_number)
        WHERE has_absolute_majority = true) results
  WHERE c.id = results.candidate_id AND c.round_id = p_round_id
    AND c.is_selected = false AND c.is_eliminated = false;

  UPDATE public.rounds
  SET selected_candidates_count = (SELECT COUNT(*) FROM public.candidates WHERE round_id = p_round_id AND is_selected = true),
      updated_at = NOW()
  WHERE id = p_round_id;

  INSERT INTO public.round_results (round_id, round_number, candidate_id, vote_count, percentage, is_visible)
  SELECT p_round_id, p_round_number, candidate_id, vote_count::INTEGER, percentage, false
  FROM public.calculate_round_results_with_majority(p_round_id, p_round_number)
  ON CONFLICT (round_id, round_number, candidate_id)
  DO UPDATE SET vote_count = EXCLUDED.vote_count, percentage = EXCLUDED.percentage, is_visible = EXCLUDED.is_visible;

  SELECT json_build_object(
    'total_ballots', (SELECT COUNT(DISTINCT v.vote_hash) FROM public.votes v
                      WHERE v.round_id = p_round_id AND v.round_number = p_round_number
                        AND COALESCE(v.is_invalidated, false) = false),
    'candidates_with_majority', (SELECT COUNT(*) FROM public.calculate_round_results_with_majority(p_round_id, p_round_number) WHERE has_absolute_majority = true),
    'total_selected', (SELECT selected_candidates_count FROM public.rounds WHERE id = p_round_id)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_occupied_seats(p_round_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM public.seats
          WHERE round_id = p_round_id AND estado = 'ocupado');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_max_votantes(p_round_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN (SELECT max_votantes FROM public.rounds WHERE id = p_round_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_round_seats_status(p_round_id uuid)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_max_votantes INTEGER; v_occupied_seats INTEGER; v_expired_seats INTEGER; v_available_seats INTEGER;
BEGIN
  SELECT max_votantes INTO v_max_votantes FROM public.rounds WHERE id = p_round_id;
  IF v_max_votantes IS NULL THEN
    RETURN json_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND', 'message', 'La ronda especificada no existe');
  END IF;
  SELECT COUNT(*) INTO v_occupied_seats FROM public.seats WHERE round_id = p_round_id AND estado = 'ocupado';
  SELECT COUNT(*) INTO v_expired_seats FROM public.seats WHERE round_id = p_round_id AND estado = 'expirado';
  v_available_seats := GREATEST(v_max_votantes - v_occupied_seats, 0);
  RETURN json_build_object('success', true, 'round_id', p_round_id, 'max_votantes', v_max_votantes,
    'occupied_seats', v_occupied_seats, 'expired_seats', v_expired_seats,
    'available_seats', v_available_seats, 'is_full', v_occupied_seats >= v_max_votantes);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_inactive_seats(p_grace_period_minutes integer DEFAULT 10)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_expired_count INTEGER;
BEGIN
  UPDATE public.seats SET estado = 'expirado', updated_at = NOW()
  WHERE estado = 'ocupado' AND last_seen_at < (NOW() - (p_grace_period_minutes || ' minutes')::INTERVAL);
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN json_build_object('success', true, 'message', 'Asientos inactivos expirados', 'expired_count', v_expired_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_round_seats(p_round_id uuid)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.seats WHERE round_id = p_round_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN json_build_object('success', true, 'message', 'Asientos liberados exitosamente', 'deleted_count', v_deleted_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_round_seat(
  p_round_id uuid, p_fingerprint_hash text, p_browser_instance_id text,
  p_user_agent text DEFAULT NULL, p_ip_address text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_max_votantes integer; v_occupied_seats integer; v_existing_seat public.seats%ROWTYPE;
        v_new_seat_id uuid; v_grace_period_minutes integer := 10; v_join_locked boolean := false;
BEGIN
  SELECT max_votantes, coalesce(join_locked, false) INTO v_max_votantes, v_join_locked FROM public.rounds WHERE id = p_round_id;
  IF v_max_votantes IS NULL THEN
    RETURN json_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND', 'message', 'La ronda especificada no existe');
  END IF;
  SELECT * INTO v_existing_seat FROM public.seats
    WHERE round_id = p_round_id AND fingerprint_hash = p_fingerprint_hash AND browser_instance_id = p_browser_instance_id;
  IF FOUND THEN
    UPDATE public.seats SET last_seen_at = NOW(), estado = 'ocupado', updated_at = NOW() WHERE id = v_existing_seat.id;
    RETURN json_build_object('success', true, 'seat_id', v_existing_seat.id, 'is_new', false, 'message', 'Reingreso exitoso al asiento existente');
  END IF;
  IF v_join_locked THEN
    RETURN json_build_object('success', false, 'error_code', 'JOIN_LOCKED', 'message', 'La entrada esta bloqueada: solo se permite reingreso de asientos existentes');
  END IF;
  SELECT public.count_occupied_seats(p_round_id) INTO v_occupied_seats;
  IF v_occupied_seats >= v_max_votantes THEN
    SELECT * INTO v_existing_seat FROM public.seats
      WHERE round_id = p_round_id AND estado = 'ocupado'
        AND last_seen_at < (NOW() - (v_grace_period_minutes || ' minutes')::INTERVAL)
      ORDER BY last_seen_at ASC LIMIT 1;
    IF FOUND THEN
      UPDATE public.seats SET estado = 'expirado', updated_at = NOW() WHERE id = v_existing_seat.id;
      INSERT INTO public.seats (round_id, fingerprint_hash, browser_instance_id, user_agent, ip_address, estado)
        VALUES (p_round_id, p_fingerprint_hash, p_browser_instance_id, p_user_agent, p_ip_address, 'ocupado')
        RETURNING id INTO v_new_seat_id;
      RETURN json_build_object('success', true, 'seat_id', v_new_seat_id, 'is_new', true, 'message', 'Asiento asignado (se libero un asiento expirado)');
    ELSE
      RETURN json_build_object('success', false, 'error_code', 'ROUND_FULL', 'message', 'La ronda esta completa. No hay asientos disponibles.',
        'occupied_seats', v_occupied_seats, 'max_votantes', v_max_votantes);
    END IF;
  END IF;
  INSERT INTO public.seats (round_id, fingerprint_hash, browser_instance_id, user_agent, ip_address, estado)
    VALUES (p_round_id, p_fingerprint_hash, p_browser_instance_id, p_user_agent, p_ip_address, 'ocupado')
    RETURNING id INTO v_new_seat_id;
  RETURN json_build_object('success', true, 'seat_id', v_new_seat_id, 'is_new', true, 'message', 'Asiento asignado exitosamente',
    'occupied_seats', v_occupied_seats + 1, 'max_votantes', v_max_votantes);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_seat(p_seat_id uuid, p_fingerprint_hash text, p_browser_instance_id text)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_seat public.seats%ROWTYPE; v_grace_period_minutes INTEGER := 10;
BEGIN
  SELECT * INTO v_seat FROM public.seats WHERE id = p_seat_id;
  IF NOT FOUND THEN RETURN json_build_object('valid', false, 'error_code', 'SEAT_NOT_FOUND', 'message', 'El asiento no existe'); END IF;
  IF v_seat.fingerprint_hash != p_fingerprint_hash OR v_seat.browser_instance_id != p_browser_instance_id THEN
    RETURN json_build_object('valid', false, 'error_code', 'SEAT_MISMATCH', 'message', 'El dispositivo o navegador no coincide con el asiento asignado');
  END IF;
  IF v_seat.estado = 'expirado' THEN
    RETURN json_build_object('valid', false, 'error_code', 'SEAT_EXPIRED', 'message', 'El asiento ha expirado por inactividad');
  END IF;
  IF v_seat.last_seen_at < (NOW() - (v_grace_period_minutes || ' minutes')::INTERVAL) THEN
    UPDATE public.seats SET estado = 'expirado', updated_at = NOW() WHERE id = p_seat_id;
    RETURN json_build_object('valid', false, 'error_code', 'SEAT_TIMEOUT', 'message', 'El asiento ha expirado por timeout');
  END IF;
  UPDATE public.seats SET last_seen_at = NOW(), updated_at = NOW() WHERE id = p_seat_id;
  RETURN json_build_object('valid', true, 'seat_id', v_seat.id, 'round_id', v_seat.round_id, 'message', 'Asiento valido');
END;
$$;

CREATE OR REPLACE FUNCTION public.open_round_room(p_round_id uuid)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_round public.rounds%ROWTYPE;
BEGIN
  SELECT * INTO v_round FROM public.rounds WHERE id = p_round_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND', 'message', 'La ronda especificada no existe'); END IF;
  IF v_round.is_closed THEN RETURN json_build_object('success', false, 'error_code', 'ROUND_CLOSED', 'message', 'La ronda ya esta cerrada'); END IF;
  UPDATE public.rounds SET is_active = true, is_voting_open = false, join_locked = false,
    round_finalized = false, show_results_to_voters = false, updated_at = NOW() WHERE id = p_round_id;
  RETURN json_build_object('success', true, 'round_id', p_round_id, 'message', 'Sala abierta. Se permiten uniones, pero aun no se puede votar.');
END;
$$;

CREATE OR REPLACE FUNCTION public.start_voting_round(p_round_id uuid)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_round public.rounds%ROWTYPE; v_candidates integer; v_occupied integer;
BEGIN
  SELECT * INTO v_round FROM public.rounds WHERE id = p_round_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND', 'message', 'La ronda especificada no existe'); END IF;
  IF v_round.is_closed THEN RETURN json_build_object('success', false, 'error_code', 'ROUND_CLOSED', 'message', 'La ronda ya esta cerrada'); END IF;
  SELECT COUNT(*)::int INTO v_candidates FROM public.candidates WHERE round_id = p_round_id AND coalesce(is_eliminated, false) = false;
  IF v_candidates < 1 THEN RETURN json_build_object('success', false, 'error_code', 'NO_CANDIDATES', 'message', 'Debe existir al menos un candidato no eliminado para iniciar la ronda'); END IF;
  SELECT COUNT(*)::int INTO v_occupied FROM public.seats WHERE round_id = p_round_id AND estado = 'ocupado';
  IF v_round.census_mode = 'exact' AND v_occupied <> v_round.max_votantes THEN
    RETURN json_build_object('success', false, 'error_code', 'EXACT_NOT_READY', 'message', 'Modo exacto: solo se puede iniciar con conectados == max_votantes',
      'occupied_seats', v_occupied, 'max_votantes', v_round.max_votantes);
  END IF;
  IF v_round.census_mode = 'maximum' AND v_occupied < 1 THEN
    RETURN json_build_object('success', false, 'error_code', 'MIN_CONNECTED_NOT_MET', 'message', 'Modo maximo: debe haber al menos 1 conectado para iniciar',
      'occupied_seats', v_occupied);
  END IF;
  UPDATE public.rounds SET is_active = true, is_voting_open = true, join_locked = true,
    round_finalized = false, show_results_to_voters = false, updated_at = NOW() WHERE id = p_round_id;
  RETURN json_build_object('success', true, 'round_id', p_round_id, 'occupied_seats', v_occupied,
    'max_votantes', v_round.max_votantes, 'census_mode', v_round.census_mode,
    'message', 'Ronda en curso. Se ha bloqueado la entrada de nuevos asientos.');
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_ballot(
  p_round_id uuid, p_seat_id uuid, p_candidate_ids uuid[], p_device_hash text,
  p_user_agent text, p_round_number integer, p_vote_hash text, p_ip_address text DEFAULT 'browser-client')
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_round public.rounds%ROWTYPE; v_existing INTEGER; v_candidate_id UUID;
BEGIN
  SELECT * INTO v_round FROM public.rounds WHERE id = p_round_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND'); END IF;
  IF NOT v_round.is_voting_open THEN RETURN json_build_object('success', false, 'error_code', 'VOTING_CLOSED'); END IF;
  SELECT COUNT(*) INTO v_existing FROM public.votes
    WHERE round_id = p_round_id AND device_hash = p_device_hash AND round_number = p_round_number;
  IF v_existing > 0 THEN RETURN json_build_object('success', false, 'error_code', 'ALREADY_VOTED'); END IF;
  IF array_length(p_candidate_ids, 1) IS NULL OR array_length(p_candidate_ids, 1) = 0 THEN
    INSERT INTO public.votes (round_id, candidate_id, seat_id, device_hash, user_agent, round_number, ip_address, vote_hash)
      VALUES (p_round_id, NULL, p_seat_id, p_device_hash, p_user_agent, p_round_number, p_ip_address, p_vote_hash);
  ELSE
    FOREACH v_candidate_id IN ARRAY p_candidate_ids LOOP
      INSERT INTO public.votes (round_id, candidate_id, seat_id, device_hash, user_agent, round_number, ip_address, vote_hash)
        VALUES (p_round_id, v_candidate_id, p_seat_id, p_device_hash, p_user_agent, p_round_number, p_ip_address, p_vote_hash);
    END LOOP;
  END IF;
  UPDATE public.rounds SET votes_current_round = (
    SELECT COUNT(DISTINCT device_hash) FROM public.votes
    WHERE round_id = p_round_id AND round_number = p_round_number),
    updated_at = NOW() WHERE id = p_round_id;
  RETURN json_build_object('success', true, 'vote_hash', p_vote_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_round_selection(p_round_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_selected_count INT; v_max_selected INT;
BEGIN
  SELECT max_selected_candidates INTO v_max_selected FROM public.rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND'); END IF;
  SELECT COUNT(*) INTO v_selected_count FROM public.candidates WHERE round_id = p_round_id AND is_selected = true;
  IF v_selected_count < v_max_selected THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'QUOTA_NOT_MET',
      'selected_count', v_selected_count, 'required', v_max_selected);
  END IF;
  UPDATE public.rounds
    SET is_closed = true, is_active = true, is_voting_open = false, round_finalized = true,
        show_results_to_voters = true, show_ballot_summary_projection = false,
        show_final_gallery_projection = false, updated_at = NOW()
    WHERE id = p_round_id;
  RETURN jsonb_build_object('success', true, 'selected_count', v_selected_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.start_new_round(p_round_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_round_number INTEGER; current_max_votes INTEGER; new_max_votes INTEGER;
        v_selected INTEGER; v_max_selected INTEGER;
BEGIN
  SELECT current_round_number + 1, COALESCE(max_votes_per_round, 0),
         COALESCE(selected_candidates_count, 0), max_selected_candidates
    INTO new_round_number, current_max_votes, v_selected, v_max_selected
  FROM public.rounds WHERE id = p_round_id;
  IF new_round_number IS NULL THEN RETURN json_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND', 'message', 'La ronda especificada no existe'); END IF;
  IF v_selected >= v_max_selected THEN
    RETURN json_build_object('success', false, 'error_code', 'QUOTA_REACHED', 'message', 'La selección ya ha alcanzado el cupo configurado');
  END IF;
  IF current_max_votes <= 0 THEN SELECT public.calculate_max_votes(p_round_id) INTO new_max_votes;
  ELSE new_max_votes := current_max_votes; END IF;
  UPDATE public.rounds
    SET current_round_number = new_round_number, max_votes_per_round = new_max_votes,
        votes_current_round = 0, is_active = true, is_voting_open = true, join_locked = true,
        round_finalized = false, show_results_to_voters = false,
        show_ballot_summary_projection = false, show_final_gallery_projection = false,
        updated_at = NOW()
    WHERE id = p_round_id;
  RETURN json_build_object('success', true, 'round_number', new_round_number, 'max_votes_per_round', new_max_votes,
    'selected_count', v_selected, 'remaining_count', GREATEST(v_max_selected - v_selected, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.force_select_candidate(p_candidate_id uuid)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_candidate public.candidates%ROWTYPE; v_round_number INTEGER; v_count INTEGER;
BEGIN
  SELECT * INTO v_candidate FROM public.candidates WHERE id = p_candidate_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error_code', 'CANDIDATE_NOT_FOUND'); END IF;
  SELECT current_round_number INTO v_round_number FROM public.rounds WHERE id = v_candidate.round_id;
  UPDATE public.candidates SET is_selected = true, selected_in_round = v_round_number, updated_at = NOW() WHERE id = p_candidate_id;
  UPDATE public.rounds SET selected_candidates_count = (
    SELECT COUNT(*) FROM public.candidates WHERE round_id = v_candidate.round_id AND is_selected = true),
    updated_at = NOW() WHERE id = v_candidate.round_id;
  SELECT COUNT(*) INTO v_count FROM public.candidates WHERE round_id = v_candidate.round_id AND is_selected = true;
  RETURN json_build_object('success', true, 'selected_count', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.unselect_candidate(p_candidate_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_round_id UUID;
BEGIN
  SELECT round_id INTO v_round_id FROM public.candidates WHERE id = p_candidate_id;
  UPDATE public.candidates SET is_selected = false, selected_in_round = NULL, selected_vote_count = NULL, updated_at = NOW() WHERE id = p_candidate_id;
  UPDATE public.rounds SET selected_candidates_count = (
    SELECT COUNT(*) FROM public.candidates WHERE round_id = v_round_id AND is_selected = true),
    updated_at = NOW() WHERE id = v_round_id;
  RETURN json_build_object('success', true, 'candidate_id', p_candidate_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_round_after_unselect(p_candidate_id uuid, p_round_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_selected_count INT; v_max_selected INT; v_round_finalized BOOL; v_is_closed BOOL;
BEGIN
  SELECT max_selected_candidates, round_finalized, is_closed INTO v_max_selected, v_round_finalized, v_is_closed
    FROM public.rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND'); END IF;
  UPDATE public.candidates SET is_selected = false, selected_in_round = NULL, selected_vote_count = NULL, updated_at = NOW()
    WHERE id = p_candidate_id AND round_id = p_round_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error_code', 'CANDIDATE_NOT_FOUND'); END IF;
  SELECT COUNT(*) INTO v_selected_count FROM public.candidates WHERE round_id = p_round_id AND is_selected = true;
  IF v_selected_count < v_max_selected THEN
    UPDATE public.rounds SET is_closed = false, is_active = true, round_finalized = true,
      show_results_to_voters = false, show_ballot_summary_projection = false, updated_at = NOW()
      WHERE id = p_round_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'selected_count', v_selected_count,
    'quota_reached', v_selected_count >= v_max_selected);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_vote_results(round_id uuid, round_number integer DEFAULT NULL)
RETURNS TABLE(candidate_id uuid, candidate_name text, candidate_surname text, vote_count bigint, is_eliminated boolean, is_selected boolean)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.surname, COALESCE(COUNT(v.id), 0)::BIGINT, c.is_eliminated, c.is_selected
  FROM public.candidates c
  LEFT JOIN public.votes v ON c.id = v.candidate_id AND c.round_id = v.round_id
    AND (round_number IS NULL OR v.round_number = round_number)
  WHERE c.round_id = get_vote_results.round_id AND c.is_eliminated = false
  GROUP BY c.id, c.name, c.surname, c.order_index, c.is_eliminated, c.is_selected
  ORDER BY c.order_index;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_vote_hash(p_vote_hash text)
RETURNS TABLE(found boolean, round_title text, round_number integer, voted_at timestamptz)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT TRUE, r.title, v.round_number, v.created_at
  FROM public.votes v JOIN public.rounds r ON r.id = v.round_id
  WHERE v.vote_hash = p_vote_hash AND v.is_invalidated = FALSE
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::INTEGER, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- Migration tracking helper (used by AGENTS.md guidance)
CREATE OR REPLACE FUNCTION public.is_migration_applied(p_version text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = p_version
  );
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS hash_password_trigger ON public.admin_users;
CREATE TRIGGER hash_password_trigger BEFORE INSERT OR UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.hash_password_trigger();

DROP TRIGGER IF EXISTS auto_assign_first_super_admin_trigger ON public.admin_users;
CREATE TRIGGER auto_assign_first_super_admin_trigger BEFORE INSERT ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_first_super_admin();

DROP TRIGGER IF EXISTS update_candidates_updated_at ON public.candidates;
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rounds_updated_at ON public.rounds;
CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_seats_updated_at ON public.seats;
CREATE TRIGGER update_seats_updated_at BEFORE UPDATE ON public.seats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_votes_current_round ON public.votes;
CREATE TRIGGER trigger_update_votes_current_round AFTER INSERT OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_votes_current_round();

-- -----------------------------------------------------------------------------
-- RLS — application-level auth, all tables allow ALL with USING (true).
-- Documented design decision. See docs/db/SCHEMA_AUDIT_2026-05-14.md.
-- -----------------------------------------------------------------------------
ALTER TABLE public.admin_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_nopausasupabase ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all admin user operations"    ON public.admin_users    FOR ALL TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all candidates operations"    ON public.candidates     FOR ALL TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all rounds operations"        ON public.rounds         FOR ALL TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all round results operations" ON public.round_results  FOR ALL TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all seats operations"         ON public.seats          FOR ALL TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all vote history operations"  ON public.vote_history   FOR ALL TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all votes operations"         ON public.votes          FOR ALL TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all voting_types operations"  ON public.voting_types   FOR ALL TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- round_participants intentionally has RLS DISABLED in production — kept as-is.
-- See SCHEMA_AUDIT_2026-05-14.md for the cleanup proposal.
ALTER TABLE public.round_participants DISABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Realtime publication
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds, public.candidates,
    public.seats, public.votes, public.round_results;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
