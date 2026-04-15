-- Migration 006: Round room lifecycle + join locking + projection ballot summary
-- Applied in Supabase project: mcmvotaciones (sjhxhsdckvungsrbquve)

alter table public.rounds
  add column if not exists is_voting_open boolean not null default false,
  add column if not exists join_locked boolean not null default false,
  add column if not exists show_ballot_summary_projection boolean not null default false;

comment on column public.rounds.is_voting_open is 'TRUE cuando la votacion esta abierta para emitir votos (ronda en curso).';
comment on column public.rounds.join_locked is 'TRUE cuando se bloquean nuevas entradas y solo se permite reingreso de asientos existentes.';
comment on column public.rounds.show_ballot_summary_projection is 'Toggle de admin para mostrar mini resumen de papeletas en /proyeccion.';

create or replace function public.open_round_room(
  p_round_id uuid
)
returns json
language plpgsql
as $$
declare
  v_round public.rounds%rowtype;
begin
  select * into v_round
  from public.rounds
  where id = p_round_id;

  if not found then
    return json_build_object(
      'success', false,
      'error_code', 'ROUND_NOT_FOUND',
      'message', 'La ronda especificada no existe'
    );
  end if;

  if v_round.is_closed then
    return json_build_object(
      'success', false,
      'error_code', 'ROUND_CLOSED',
      'message', 'La ronda ya esta cerrada'
    );
  end if;

  update public.rounds
  set
    is_active = true,
    is_voting_open = false,
    join_locked = false,
    round_finalized = false,
    show_results_to_voters = false,
    updated_at = now()
  where id = p_round_id;

  return json_build_object(
    'success', true,
    'round_id', p_round_id,
    'message', 'Sala abierta. Se permiten uniones, pero aun no se puede votar.'
  );
end;
$$;

create or replace function public.start_voting_round(
  p_round_id uuid
)
returns json
language plpgsql
as $$
declare
  v_round public.rounds%rowtype;
  v_candidates integer;
  v_occupied integer;
begin
  select * into v_round
  from public.rounds
  where id = p_round_id;

  if not found then
    return json_build_object(
      'success', false,
      'error_code', 'ROUND_NOT_FOUND',
      'message', 'La ronda especificada no existe'
    );
  end if;

  if v_round.is_closed then
    return json_build_object(
      'success', false,
      'error_code', 'ROUND_CLOSED',
      'message', 'La ronda ya esta cerrada'
    );
  end if;

  select count(*)::int into v_candidates
  from public.candidates
  where round_id = p_round_id
    and coalesce(is_eliminated, false) = false;

  if v_candidates < 1 then
    return json_build_object(
      'success', false,
      'error_code', 'NO_CANDIDATES',
      'message', 'Debe existir al menos un candidato no eliminado para iniciar la ronda'
    );
  end if;

  select count(*)::int into v_occupied
  from public.seats
  where round_id = p_round_id
    and estado = 'ocupado';

  if v_round.census_mode = 'exact' and v_occupied <> v_round.max_votantes then
    return json_build_object(
      'success', false,
      'error_code', 'EXACT_NOT_READY',
      'message', 'Modo exacto: solo se puede iniciar con conectados == max_votantes',
      'occupied_seats', v_occupied,
      'max_votantes', v_round.max_votantes
    );
  end if;

  if v_round.census_mode = 'maximum' and v_occupied < 1 then
    return json_build_object(
      'success', false,
      'error_code', 'MIN_CONNECTED_NOT_MET',
      'message', 'Modo maximo: debe haber al menos 1 conectado para iniciar',
      'occupied_seats', v_occupied
    );
  end if;

  update public.rounds
  set
    is_active = true,
    is_voting_open = true,
    join_locked = true,
    round_finalized = false,
    show_results_to_voters = false,
    updated_at = now()
  where id = p_round_id;

  return json_build_object(
    'success', true,
    'round_id', p_round_id,
    'occupied_seats', v_occupied,
    'max_votantes', v_round.max_votantes,
    'census_mode', v_round.census_mode,
    'message', 'Ronda en curso. Se ha bloqueado la entrada de nuevos asientos.'
  );
end;
$$;

create or replace function public.join_round_seat(
  p_round_id uuid,
  p_fingerprint_hash text,
  p_browser_instance_id text,
  p_user_agent text default null,
  p_ip_address text default null
)
returns json
language plpgsql
as $$
declare
  v_max_votantes integer;
  v_occupied_seats integer;
  v_existing_seat public.seats%rowtype;
  v_new_seat_id uuid;
  v_grace_period_minutes integer := 10;
  v_join_locked boolean := false;
begin
  select max_votantes, coalesce(join_locked, false)
    into v_max_votantes, v_join_locked
  from public.rounds
  where id = p_round_id;

  if v_max_votantes is null then
    return json_build_object(
      'success', false,
      'error_code', 'ROUND_NOT_FOUND',
      'message', 'La ronda especificada no existe'
    );
  end if;

  select * into v_existing_seat
  from public.seats
  where round_id = p_round_id
    and fingerprint_hash = p_fingerprint_hash
    and browser_instance_id = p_browser_instance_id;

  if found then
    update public.seats
    set
      last_seen_at = now(),
      estado = 'ocupado',
      updated_at = now()
    where id = v_existing_seat.id;

    return json_build_object(
      'success', true,
      'seat_id', v_existing_seat.id,
      'is_new', false,
      'message', 'Reingreso exitoso al asiento existente'
    );
  end if;

  if v_join_locked then
    return json_build_object(
      'success', false,
      'error_code', 'JOIN_LOCKED',
      'message', 'La entrada esta bloqueada: solo se permite reingreso de asientos existentes'
    );
  end if;

  select count_occupied_seats(p_round_id) into v_occupied_seats;

  if v_occupied_seats >= v_max_votantes then
    select * into v_existing_seat
    from public.seats
    where round_id = p_round_id
      and estado = 'ocupado'
      and last_seen_at < (now() - (v_grace_period_minutes || ' minutes')::interval)
    order by last_seen_at asc
    limit 1;

    if found then
      update public.seats
      set estado = 'expirado', updated_at = now()
      where id = v_existing_seat.id;

      insert into public.seats (
        round_id,
        fingerprint_hash,
        browser_instance_id,
        user_agent,
        ip_address,
        estado
      ) values (
        p_round_id,
        p_fingerprint_hash,
        p_browser_instance_id,
        p_user_agent,
        p_ip_address,
        'ocupado'
      ) returning id into v_new_seat_id;

      return json_build_object(
        'success', true,
        'seat_id', v_new_seat_id,
        'is_new', true,
        'message', 'Asiento asignado (se libero un asiento expirado)'
      );
    else
      return json_build_object(
        'success', false,
        'error_code', 'ROUND_FULL',
        'message', 'La ronda esta completa. No hay asientos disponibles.',
        'occupied_seats', v_occupied_seats,
        'max_votantes', v_max_votantes
      );
    end if;
  end if;

  insert into public.seats (
    round_id,
    fingerprint_hash,
    browser_instance_id,
    user_agent,
    ip_address,
    estado
  ) values (
    p_round_id,
    p_fingerprint_hash,
    p_browser_instance_id,
    p_user_agent,
    p_ip_address,
    'ocupado'
  ) returning id into v_new_seat_id;

  return json_build_object(
    'success', true,
    'seat_id', v_new_seat_id,
    'is_new', true,
    'message', 'Asiento asignado exitosamente',
    'occupied_seats', v_occupied_seats + 1,
    'max_votantes', v_max_votantes
  );
end;
$$;
