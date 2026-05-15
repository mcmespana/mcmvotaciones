-- release_seat: marks a single occupied seat as expirado so join_round_seat can recycle it
CREATE OR REPLACE FUNCTION release_seat(p_seat_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE seats SET estado = 'expirado' WHERE id = p_seat_id AND estado = 'ocupado';
END;
$$;

-- release_ghost_seats: batch-release multiple occupied seats; returns count of rows updated
CREATE OR REPLACE FUNCTION release_ghost_seats(p_seat_ids uuid[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  released_count integer;
BEGIN
  UPDATE seats SET estado = 'expirado' WHERE id = ANY(p_seat_ids) AND estado = 'ocupado';
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;
