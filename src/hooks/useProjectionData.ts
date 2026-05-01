import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { debugLog } from "@/lib/logger";
import { formatSurname } from "@/lib/candidateFormat";

interface Round {
  id: string;
  title: string;
  description: string;
  team: "ECE" | "ECL";
  current_round_number: number;
  max_votes_per_round: number;
  max_selected_candidates: number;
  selected_candidates_count: number;
  max_votantes: number;
  votes_current_round: number;
  is_active: boolean;
  is_closed: boolean;
  round_finalized: boolean;
  show_results_to_voters: boolean;
  access_code: string | null;
  show_ballot_summary_projection: boolean;
  show_final_gallery_projection: boolean;
  voting_type_name: string | null;
  is_voting_open: boolean;
  join_locked: boolean;
  updated_at: string;
}

interface Candidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  group_name: string | null;
  age: number | null;
  image_url: string | null;
  is_eliminated: boolean;
  is_selected: boolean;
  selected_in_round: number | null;
  selected_vote_count: number | null;
}

interface RoundResult {
  candidate_id: string;
  vote_count: number;
  percentage: number;
}

export interface BallotSummary {
  voteCode: string;
  roundNumber: number;
  timestamp: string;
  votes: string[];
}

export type ProjectionState = "waiting" | "voting" | "results" | "final-gallery";
export type ProjectionWaitingMode = "idle" | "room-open" | "paused" | "finalized" | "closed";

export interface ProjectionData {
  state: ProjectionState;
  round: Round | null;
  candidates: Candidate[];
  results: RoundResult[];
  voteCount: number;
  connectedCount: number;
  elapsedSeconds: number;
  selectedCandidates: Candidate[];
  ballotSummaries: BallotSummary[];
  showConnectedInWaiting: boolean;
  showAccessCodeInWaiting: boolean;
  waitingMode: ProjectionWaitingMode;
  /** All candidates selected in previous rounds */
  previouslySelected: Candidate[];
}

export function useProjectionData(): ProjectionData {
  const [round, setRound] = useState<Round | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [voteCount, setVoteCount] = useState(0);
  const [connectedCount, setConnectedCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ballotSummaries, setBallotSummaries] = useState<BallotSummary[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundStartRef = useRef<Date | null>(null);

  // Determine the projection state
  const state: ProjectionState = (() => {
    if (!round) return "waiting";
    // Si la ronda está proyectando ganadores, se muestra aunque no esté activa o esté cerrada
    if (round.show_final_gallery_projection) return "final-gallery";
    // Si la ronda está proyectando resultados o papeletas, se muestra aunque no esté activa o esté cerrada
    if (round.round_finalized && round.show_results_to_voters) return "results";
    
    // De lo contrario, usamos logica normal
    if (!round.is_active || round.is_closed) return "waiting";
    if (round.is_voting_open) return "voting";
    return "waiting";
  })();

  const showConnectedInWaiting = Boolean(
    round && round.is_active && !round.is_voting_open && !round.is_closed && !round.round_finalized && !round.show_final_gallery_projection
  );

  const showAccessCodeInWaiting = Boolean(
    round &&
      round.is_active &&
      !round.is_closed &&
      !round.is_voting_open &&
      !round.round_finalized &&
      round.current_round_number === 1 &&
      !round.join_locked
  );

  const waitingMode: ProjectionWaitingMode = (() => {
    if (!round) return "idle";
    if (round.is_closed && !round.show_final_gallery_projection) return "closed";
    if (!round.is_active || round.show_final_gallery_projection) return "idle";
    if (round.round_finalized && !round.show_results_to_voters) return "finalized";
    if (!round.is_voting_open && round.join_locked && !round.round_finalized) return "paused";
    if (!round.is_voting_open && !round.round_finalized) return "room-open";
    return "idle";
  })();

  // Selected candidates (from current round results)
  const selectedCandidates = candidates.filter((c) => c.is_selected);

  // Load the active round and its data
  const loadActiveRound = useCallback(async () => {
    try {
      let targetRound = null;

      const { data: activeRounds } = await supabase
        .from("rounds")
        .select("*")
        .eq("is_active", true)
        .limit(1);

      if (activeRounds && activeRounds.length > 0) {
        targetRound = activeRounds[0];
      } else {
        // If no active round, fetch the most recently updated one (e.g. just closed)
        const { data: latestRounds } = await supabase
          .from("rounds")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1);
        if (latestRounds && latestRounds.length > 0) {
          targetRound = latestRounds[0];
        }
      }

      if (!targetRound) {
        setRound(null);
        setCandidates([]);
        setResults([]);
        setBallotSummaries([]);
        setVoteCount(0);
        return;
      }

      const activeRound = targetRound as Round;
      setRound(activeRound);
      setVoteCount(activeRound.votes_current_round || 0);

      // Load candidates
      const { data: candidateData } = await supabase
        .from("candidates")
        .select("*")
        .eq("round_id", activeRound.id)
        .order("order_index");

      if (candidateData) setCandidates(candidateData);

      if (activeRound.show_ballot_summary_projection) {
        const { data: voteRows } = await supabase
          .from("votes")
          .select(`
            vote_hash,
            round_number,
            created_at,
            candidate:candidates (name, surname)
          `)
          .eq("round_id", activeRound.id)
          .eq("round_number", activeRound.current_round_number)
          .eq("is_invalidated", false)
          .order("created_at", { ascending: true });

        const grouped = new Map<string, BallotSummary>();
        for (const row of voteRows || []) {
          const hash = (row.vote_hash || "").toString();
          if (!hash) continue;

          // Supabase returns a single object for foreign keys if correctly configured, but TypeScript thinks it might be an array
          const candidateData = Array.isArray(row.candidate) ? row.candidate[0] : row.candidate;

          const voteName = candidateData
            ? `${candidateData.name} ${formatSurname(candidateData.surname)}`.trim()
            : "-";

          if (!grouped.has(hash)) {
            grouped.set(hash, {
              voteCode: `VT-${hash.slice(0, 4).toUpperCase()}-${hash.slice(4, 8).toUpperCase()}`,
              roundNumber: row.round_number,
              timestamp: row.created_at,
              votes: [voteName],
            });
          } else {
            grouped.get(hash)!.votes.push(voteName);
          }
        }

        const normalized = Array.from(grouped.values()).map((item) => {
          const votes = [...item.votes];
          while (votes.length < 3) {
            votes.push("-");
          }
          return { ...item, votes: votes.slice(0, 3) };
        });

        setBallotSummaries(normalized);
      } else {
        setBallotSummaries([]);
      }

      // Load results if finalized
      if (activeRound.round_finalized) {
        const { data: resultData } = await supabase
          .from("round_results")
          .select("candidate_id, vote_count, percentage")
          .eq("round_id", activeRound.id)
          .eq("round_number", activeRound.current_round_number)
          .order("vote_count", { ascending: false });

        if (resultData) setResults(resultData);
      }

      // Start timer if voting
      if (activeRound.is_active && !activeRound.round_finalized && !activeRound.is_closed) {
        if (!roundStartRef.current) {
          roundStartRef.current = new Date();
        }
      }
    } catch (error) {
      debugLog("Error loading projection data:", error);
    }
  }, []);

  // Load connected seats count
  const loadConnectedCount = useCallback(async () => {
    if (!round) {
      setConnectedCount(0);
      return;
    }
    try {
      const { count } = await supabase
        .from("seats")
        .select("*", { count: "exact", head: true })
        .eq("round_id", round.id)
        .eq("estado", "ocupado");

      setConnectedCount(count || 0);
    } catch {
      // seats table might not exist yet, silently ignore
    }
  }, [round]);

  // Elapsed time timer
  useEffect(() => {
    if (state === "voting") {
      if (!roundStartRef.current) roundStartRef.current = new Date();

      timerRef.current = setInterval(() => {
        if (roundStartRef.current) {
          const diff = Math.floor(
            (Date.now() - roundStartRef.current.getTime()) / 1000
          );
          setElapsedSeconds(diff);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      roundStartRef.current = null;
      setElapsedSeconds(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Initial load
  useEffect(() => {
    loadActiveRound();
  }, [loadActiveRound]);

  // Poll connected count every 5 seconds
  useEffect(() => {
    loadConnectedCount();
    const interval = setInterval(loadConnectedCount, 5000);
    return () => clearInterval(interval);
  }, [loadConnectedCount]);

  // Real-time subscriptions
  useEffect(() => {
    const uid = crypto.randomUUID();
    const roundsChannel = supabase
      .channel(`projection-rounds-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds" },
        () => {
          debugLog("📺 Projection: round changed, reloading...");
          loadActiveRound();
        }
      )
      .subscribe();

    let voteDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const votesChannel = supabase
      .channel(`projection-votes-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes" },
        () => {
          if (voteDebounceTimer) clearTimeout(voteDebounceTimer);
          voteDebounceTimer = setTimeout(() => loadActiveRound(), 1000);
        }
      )
      .subscribe();

    const resultsChannel = supabase
      .channel(`projection-results-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_results" },
        () => {
          debugLog("📺 Projection: results changed, reloading...");
          loadActiveRound();
        }
      )
      .subscribe();

    return () => {
      if (voteDebounceTimer) clearTimeout(voteDebounceTimer);
      supabase.removeChannel(roundsChannel);
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(resultsChannel);
    };
  }, [loadActiveRound]);

  return {
    state,
    round,
    candidates,
    results,
    voteCount,
    connectedCount,
    elapsedSeconds,
    selectedCandidates,
    ballotSummaries,
    showConnectedInWaiting,
    showAccessCodeInWaiting,
    waitingMode,
    previouslySelected: [...selectedCandidates].sort((a, b) => {
      const ra = a.selected_in_round ?? 999;
      const rb = b.selected_in_round ?? 999;
      if (ra !== rb) return ra - rb;
      return (b.selected_vote_count ?? 0) - (a.selected_vote_count ?? 0);
    }),
  };
}
