import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACCESS_CODE_REGEX, generateAccessCode } from "@/lib/accessCode";
import type { RoundRow, CandidateRow } from "@/types/db";
import type { useToast } from "@/hooks/use-toast";

export type RoundDetail = RoundRow;
export type Candidate = CandidateRow;

export interface SeatRow {
  id: string;
  estado: "libre" | "ocupado" | "expirado";
  joined_at: string;
  last_seen_at: string;
  browser_instance_id: string;
}

export interface SeatStatus {
  occupied_seats: number;
  expired_seats: number;
  available_seats: number;
}

export interface InlineResult {
  candidate_id: string;
  vote_count: number;
  percentage: number;
  candidate_name: string;
  candidate_surname: string;
  is_selected: boolean;
  has_majority: boolean;
}

interface UseRoundDetailOptions {
  roundId: string | undefined;
  toast: ReturnType<typeof useToast>["toast"];
}

export function useRoundDetail({ roundId, toast }: UseRoundDetailOptions) {
  const [round, setRound] = useState<RoundDetail | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [seatStatus, setSeatStatus] = useState<SeatStatus | null>(null);
  const [currentRoundVotes, setCurrentRoundVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inlineResults, setInlineResults] = useState<InlineResult[]>([]);
  const [now, setNow] = useState(Date.now());
  const [liveSeatIds, setLiveSeatIds] = useState<Set<string> | null>(null);
  const [presenceChecking, setPresenceChecking] = useState(false);

  // Config form state (synced from round on load)
  const [configAccessCode, setConfigAccessCode] = useState("");
  const [configCensusMode, setConfigCensusMode] = useState<"maximum" | "exact">("maximum");
  const [configMaxVotantes, setConfigMaxVotantes] = useState(0);
  const [configMaxSelected, setConfigMaxSelected] = useState(0);
  const [configMaxVotesPerRound, setConfigMaxVotesPerRound] = useState(0);

  const currentRoundNumberRef = useRef(1);
  const channelUid = useRef(crypto.randomUUID()).current;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadSeatsAndStatus = useCallback(async () => {
    if (!roundId) return;
    const [{ data: seatData, error: seatError }, { data: seatStatusData, error: seatStatusError }] = await Promise.all([
      supabase.from("seats").select("id,estado,joined_at,last_seen_at,browser_instance_id").eq("round_id", roundId).order("joined_at", { ascending: false }).limit(60),
      supabase.rpc("get_round_seats_status", { p_round_id: roundId }),
    ]);
    if (!seatError) setSeats((seatData || []) as SeatRow[]);
    if (!seatStatusError && seatStatusData) {
      const parsed = seatStatusData as { occupied_seats?: number; expired_seats?: number; available_seats?: number };
      setSeatStatus({ occupied_seats: parsed.occupied_seats || 0, expired_seats: parsed.expired_seats || 0, available_seats: parsed.available_seats || 0 });
    }
  }, [roundId]);

  const loadCandidates = useCallback(async () => {
    if (!roundId) return;
    const { data, error } = await supabase.from("candidates").select("id,name,surname,location,group_name,age,description,image_url,crm_id,order_index,is_eliminated,is_selected,asamblea_movimiento_es,asamblea_responsabilidad").eq("round_id", roundId).order("order_index", { ascending: true });
    if (!error) setCandidates((data || []) as Candidate[]);
  }, [roundId]);

  const loadCurrentRoundVotes = useCallback(async (roundNumber: number) => {
    if (!roundId || !roundNumber) return;
    const { data: liveVoteRows } = await supabase.from("votes").select("vote_hash, seat_id, device_hash").eq("round_id", roundId).eq("round_number", roundNumber);
    const uniqueBallots = new Set((liveVoteRows || []).map((row) => row.vote_hash || row.seat_id || row.device_hash).filter(Boolean));
    setCurrentRoundVotes(uniqueBallots.size);
  }, [roundId]);

  const loadInlineResults = useCallback(async (roundNumber: number) => {
    if (!roundId) return;
    type InlineResultRow = {
      candidate_id: string;
      vote_count: number;
      percentage: number;
      candidate: { name?: string | null; surname?: string | null; is_selected?: boolean | null } | Array<{ name?: string | null; surname?: string | null; is_selected?: boolean | null }> | null;
    };
    const { data } = await supabase
      .from("round_results")
      .select(`candidate_id, vote_count, percentage, candidate:candidates (name, surname, is_selected)`)
      .eq("round_id", roundId)
      .eq("round_number", roundNumber)
      .order("vote_count", { ascending: false });
    if (!data) return;
    const results: InlineResult[] = (data as InlineResultRow[]).map((r) => {
      const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
      return {
        candidate_id: r.candidate_id,
        vote_count: r.vote_count,
        percentage: r.percentage,
        candidate_name: c?.name || "?",
        candidate_surname: c?.surname || "",
        is_selected: c?.is_selected || false,
        has_majority: r.percentage > 50,
      };
    });
    setInlineResults(results);
  }, [roundId]);

  const loadRound = useCallback(async (options?: { silent?: boolean }) => {
    if (!roundId) return;
    try {
      if (!options?.silent) setLoading(true);
      const [
        { data: roundData, error: roundError },
        { data: candidateData, error: candidateError },
        { data: seatData, error: seatError },
        { data: seatStatusData, error: seatStatusError },
      ] = await Promise.all([
        supabase.from("rounds").select("id,slug,title,description,year,team,max_votantes,max_selected_candidates,max_votes_per_round,access_code,census_mode,is_active,is_closed,is_voting_open,join_locked,round_finalized,show_results_to_voters,show_ballot_summary_projection,show_final_gallery_projection,public_candidates_enabled,current_round_number,votes_current_round,voting_type_name").eq("id", roundId).single(),
        supabase.from("candidates").select("id,name,surname,location,group_name,age,description,image_url,crm_id,order_index,is_eliminated,is_selected,asamblea_movimiento_es,asamblea_responsabilidad").eq("round_id", roundId).order("order_index", { ascending: true }),
        supabase.from("seats").select("id,estado,joined_at,last_seen_at,browser_instance_id").eq("round_id", roundId).order("joined_at", { ascending: false }).limit(60),
        supabase.rpc("get_round_seats_status", { p_round_id: roundId }),
      ]);
      if (roundError) throw roundError;
      if (candidateError) throw candidateError;
      if (seatError) throw seatError;
      const normalizedRound = roundData as RoundDetail;
      setRound(normalizedRound);
      currentRoundNumberRef.current = normalizedRound.current_round_number || 1;
      setCandidates((candidateData || []) as Candidate[]);
      setSeats((seatData || []) as SeatRow[]);
      await loadCurrentRoundVotes(normalizedRound.current_round_number);
      const normalizedAccessCode = (normalizedRound.access_code || "").toUpperCase();
      setConfigAccessCode(ACCESS_CODE_REGEX.test(normalizedAccessCode) ? normalizedAccessCode : generateAccessCode());
      setConfigCensusMode((normalizedRound.census_mode || "maximum") as "maximum" | "exact");
      setConfigMaxVotantes(normalizedRound.max_votantes || 0);
      setConfigMaxSelected(normalizedRound.max_selected_candidates || 0);
      setConfigMaxVotesPerRound(normalizedRound.max_votes_per_round || 0);
      if (!seatStatusError && seatStatusData) {
        const parsed = seatStatusData as { occupied_seats?: number; expired_seats?: number; available_seats?: number };
        setSeatStatus({ occupied_seats: parsed.occupied_seats || 0, expired_seats: parsed.expired_seats || 0, available_seats: parsed.available_seats || 0 });
      } else {
        setSeatStatus(null);
      }
      if (normalizedRound.round_finalized && !normalizedRound.is_closed) {
        loadInlineResults(normalizedRound.current_round_number);
      } else {
        setInlineResults([]);
      }
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el detalle de la votacion", variant: "destructive" });
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [roundId, toast, loadCurrentRoundVotes, loadInlineResults]);

  // One-shot presence check — subscribes, reads state, unsubscribes
  const checkPresence = useCallback(async () => {
    if (!roundId || presenceChecking) return;
    setPresenceChecking(true);
    setLiveSeatIds(null);
    const ch = supabase.channel(`round-presence-check-${crypto.randomUUID()}`);
    await new Promise<void>((resolve) => {
      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<{ seat_id: string }>();
        const ids = new Set<string>();
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            if (p.seat_id) ids.add(p.seat_id);
          }
        }
        setLiveSeatIds(ids);
        resolve();
      }).subscribe();
      // Fallback: resolve after 8s even if no sync event arrives
      setTimeout(resolve, 8000);
    });
    supabase.removeChannel(ch);
    setPresenceChecking(false);
  }, [roundId, presenceChecking]);

  const releaseSeat = useCallback(async (seatId: string) => {
    await supabase.rpc('release_seat', { p_seat_id: seatId });
    await loadSeatsAndStatus();
  }, [loadSeatsAndStatus]);

  const releaseGhostSeats = useCallback(async (ghostIds: string[]) => {
    if (ghostIds.length === 0) return 0;
    const { data } = await supabase.rpc('release_ghost_seats', { p_seat_ids: ghostIds });
    await loadSeatsAndStatus();
    return (data as number) ?? 0;
  }, [loadSeatsAndStatus]);

  useEffect(() => {
    loadRound();
    const channel = supabase
      .channel(`admin-voting-detail-${roundId}-${channelUid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `id=eq.${roundId}` }, () => loadRound())
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates", filter: `round_id=eq.${roundId}` }, () => loadCandidates())
      .on("postgres_changes", { event: "*", schema: "public", table: "seats", filter: `round_id=eq.${roundId}` }, () => loadSeatsAndStatus())
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `round_id=eq.${roundId}` }, () => {
        loadCurrentRoundVotes(currentRoundNumberRef.current);
        loadRound({ silent: true });
      })
      .subscribe();
    const metricsInterval = window.setInterval(() => {
      loadSeatsAndStatus();
      loadCurrentRoundVotes(currentRoundNumberRef.current);
      loadRound({ silent: true });
    }, 15_000);
    return () => { window.clearInterval(metricsInterval); supabase.removeChannel(channel); };
  }, [loadRound, roundId, loadSeatsAndStatus, loadCurrentRoundVotes, loadCandidates, loadInlineResults]);

  return {
    round, candidates, seats, seatStatus, currentRoundVotes, loading, inlineResults, now,
    currentRoundNumberRef,
    liveSeatIds, presenceChecking,
    checkPresence, releaseSeat, releaseGhostSeats,
    loadRound, loadCandidates, loadSeatsAndStatus, loadCurrentRoundVotes, loadInlineResults,
    configAccessCode, setConfigAccessCode,
    configCensusMode, setConfigCensusMode,
    configMaxVotantes, setConfigMaxVotantes,
    configMaxSelected, setConfigMaxSelected,
    configMaxVotesPerRound, setConfigMaxVotesPerRound,
  };
}
