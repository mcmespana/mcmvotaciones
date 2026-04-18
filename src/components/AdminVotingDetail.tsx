import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { ACCESS_CODE_REGEX, generateAccessCode } from "@/lib/accessCode";
import { useToast } from "@/hooks/use-toast";
import { testDatasets } from "@/lib/testDatasets";
import { ArrowLeft, ArrowUpRight, Download, FileUp, Pause, Pencil, Play, RefreshCw, Settings2, Sparkles, StepForward, Trash2, UserPlus, XCircle, MonitorOff } from "lucide-react";
import { ResultsAnalytics } from "@/components/ResultsAnalytics";
import { BallotReview } from "@/components/BallotReview";

interface RoundDetail {
  id: string;
  title: string;
  description: string | null;
  year: number;
  team: "ECE" | "ECL";
  max_votantes: number;
  max_selected_candidates: number;
  access_code: string | null;
  census_mode: "maximum" | "exact";
  is_active: boolean;
  is_closed: boolean;
  is_voting_open: boolean;
  join_locked: boolean;
  round_finalized: boolean;
  show_results_to_voters: boolean;
  show_ballot_summary_projection: boolean;
  show_final_gallery_projection: boolean;
  current_round_number: number;
  votes_current_round: number;
}

interface Candidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  group_name: string | null;
  age: number | null;
  description: string | null;
  image_url: string | null;
  order_index: number;
  is_eliminated: boolean;
  is_selected: boolean;
}

interface SeatRow {
  id: string;
  estado: "libre" | "ocupado" | "expirado";
  joined_at: string;
  last_seen_at: string;
  browser_instance_id: string;
}

interface SeatStatus {
  occupied_seats: number;
  expired_seats: number;
  available_seats: number;
  max_votantes: number;
}

interface VoteExportRow {
  round_number: number;
  vote_hash: string | null;
  created_at: string;
  is_invalidated: boolean;
  invalidation_reason: string | null;
  candidate: {
    name: string;
    surname: string;
  } | Array<{
    name: string;
    surname: string;
  }> | null;
}

interface CandidateFormState {
  name: string;
  surname: string;
  location: string;
  group_name: string;
  age: number | "";
  description: string;
  image_url: string;
}

type ImportCandidate = Omit<CandidateFormState, "age"> & { age: number | null };

const normalizeVoteCandidate = (candidate: VoteExportRow["candidate"]) =>
  Array.isArray(candidate) ? candidate[0] : candidate;

function shortBallotCode(hash: string | null): string {
  if (!hash) {
    return "sin_hash";
  }
  return `VT-${hash.slice(0, 4).toUpperCase()}-${hash.slice(4, 8).toUpperCase()}`;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function AdminVotingDetail() {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [round, setRound] = useState<RoundDetail | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [seatStatus, setSeatStatus] = useState<SeatStatus | null>(null);
  const [currentRoundVotes, setCurrentRoundVotes] = useState(0);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configAccessCode, setConfigAccessCode] = useState("");
  const [configCensusMode, setConfigCensusMode] = useState<"maximum" | "exact">("maximum");
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isBallotsOpen, setIsBallotsOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isEditCandidateOpen, setIsEditCandidateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDatasetOpen, setIsDatasetOpen] = useState(false);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(testDatasets[0]?.id ?? "");
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateForm, setCandidateForm] = useState<CandidateFormState>({
    name: "",
    surname: "",
    location: "",
    group_name: "",
    age: "",
    description: "",
    image_url: "",
  });
  const currentRoundNumberRef = useRef(1);

  const loadSeatsAndStatus = useCallback(async () => {
    if (!roundId) return;

    const [{ data: seatData, error: seatError }, { data: seatStatusData, error: seatStatusError }] = await Promise.all([
      supabase
        .from("seats")
        .select("id,estado,joined_at,last_seen_at,browser_instance_id")
        .eq("round_id", roundId)
        .order("joined_at", { ascending: false })
        .limit(60),
      supabase.rpc("get_round_seats_status", { p_round_id: roundId }),
    ]);

    if (!seatError) {
      setSeats((seatData || []) as SeatRow[]);
    }

    if (!seatStatusError && seatStatusData) {
      const parsed = seatStatusData as {
        occupied_seats?: number;
        expired_seats?: number;
        available_seats?: number;
        max_votantes?: number;
      };
      setSeatStatus((prev) => ({
        occupied_seats: parsed.occupied_seats || 0,
        expired_seats: parsed.expired_seats || 0,
        available_seats: parsed.available_seats || 0,
        max_votantes: parsed.max_votantes || prev?.max_votantes || round?.max_votantes || 0,
      }));
    }
  }, [roundId, round?.max_votantes]);

  const loadCurrentRoundVotes = useCallback(async (roundNumber: number) => {
    if (!roundId || !roundNumber) return;

    const { data: liveVoteRows } = await supabase
      .from("votes")
      .select("vote_hash, seat_id, device_hash")
      .eq("round_id", roundId)
      .eq("round_number", roundNumber);

    const uniqueBallots = new Set(
      (liveVoteRows || []).map((row) => row.vote_hash || row.seat_id || row.device_hash).filter(Boolean)
    );
    setCurrentRoundVotes(uniqueBallots.size);
  }, [roundId]);

  const loadRound = useCallback(async () => {
    if (!roundId) {
      return;
    }

    try {
      setLoading(true);

      const [{ data: roundData, error: roundError }, { data: candidateData, error: candidateError }, { data: seatData, error: seatError }, { data: seatStatusData, error: seatStatusError }] = await Promise.all([
        supabase
          .from("rounds")
          .select("id,title,description,year,team,max_votantes,max_selected_candidates,access_code,census_mode,is_active,is_closed,is_voting_open,join_locked,round_finalized,show_results_to_voters,show_ballot_summary_projection,show_final_gallery_projection,current_round_number,votes_current_round")
          .eq("id", roundId)
          .single(),
        supabase
          .from("candidates")
          .select("id,name,surname,location,group_name,age,description,image_url,order_index,is_eliminated,is_selected")
          .eq("round_id", roundId)
          .order("order_index", { ascending: true }),
        supabase
          .from("seats")
          .select("id,estado,joined_at,last_seen_at,browser_instance_id")
          .eq("round_id", roundId)
          .order("joined_at", { ascending: false })
          .limit(60),
        supabase.rpc("get_round_seats_status", { p_round_id: roundId }),
      ]);

      if (roundError) {
        throw roundError;
      }
      if (candidateError) {
        throw candidateError;
      }
      if (seatError) {
        throw seatError;
      }

      const normalizedRound = roundData as RoundDetail;
      setRound(normalizedRound);
      currentRoundNumberRef.current = normalizedRound.current_round_number || 1;
      setCandidates((candidateData || []) as Candidate[]);
      setSeats((seatData || []) as SeatRow[]);
      await loadCurrentRoundVotes(normalizedRound.current_round_number);

      const normalizedAccessCode = (normalizedRound.access_code || "").toUpperCase();
      setConfigAccessCode(
        ACCESS_CODE_REGEX.test(normalizedAccessCode) ? normalizedAccessCode : generateAccessCode()
      );
      setConfigCensusMode((normalizedRound.census_mode || "maximum") as "maximum" | "exact");

      if (!seatStatusError && seatStatusData) {
        const parsed = seatStatusData as {
          occupied_seats?: number;
          expired_seats?: number;
          available_seats?: number;
          max_votantes?: number;
        };
        setSeatStatus({
          occupied_seats: parsed.occupied_seats || 0,
          expired_seats: parsed.expired_seats || 0,
          available_seats: parsed.available_seats || 0,
          max_votantes: parsed.max_votantes || normalizedRound.max_votantes,
        });
      } else {
        setSeatStatus(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle de la votacion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [roundId, toast, loadCurrentRoundVotes]);

  useEffect(() => {
    loadRound();

    const channel = supabase
      .channel(`admin-voting-detail-${roundId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `id=eq.${roundId}` }, () => loadRound())
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates", filter: `round_id=eq.${roundId}` }, () => loadRound())
      .on("postgres_changes", { event: "*", schema: "public", table: "seats", filter: `round_id=eq.${roundId}` }, () => loadSeatsAndStatus())
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `round_id=eq.${roundId}` }, () => loadCurrentRoundVotes(currentRoundNumberRef.current))
      .subscribe();

    // Fallback ligero: si el canal realtime se retrasa, refrescamos solo métricas vivas.
    const metricsInterval = window.setInterval(() => {
      loadSeatsAndStatus();
      loadCurrentRoundVotes(currentRoundNumberRef.current);
    }, 3000);

    return () => {
      window.clearInterval(metricsInterval);
      supabase.removeChannel(channel);
    };
  }, [loadRound, roundId, loadSeatsAndStatus, loadCurrentRoundVotes]);

  const activeCandidatesCount = useMemo(
    () => candidates.filter((candidate) => !candidate.is_eliminated).length,
    [candidates]
  );

  const selectedCandidatesCount = useMemo(
    () => candidates.filter((candidate) => candidate.is_selected).length,
    [candidates]
  );
  const maxSelectedCandidates = round?.max_selected_candidates || 6;
  const selectionQuotaReached = selectedCandidatesCount >= maxSelectedCandidates;

  const roomIsOpen = Boolean(round && round.is_active && !round.is_voting_open && !round.is_closed);
  const canOpenRoom = Boolean(round && !selectionQuotaReached && !round.is_closed && !round.is_voting_open && !round.is_active);
  const canCloseRoom = Boolean(round && roomIsOpen);
  const canStartRound = Boolean(round && !selectionQuotaReached && !round.is_closed && round.is_active && !round.is_voting_open && !round.round_finalized && !round.join_locked);
  const canPauseRound = Boolean(round && round.is_active && round.is_voting_open && !round.round_finalized && !round.is_closed);
  const canResumeRound = Boolean(round && round.is_active && !round.is_voting_open && round.join_locked && !round.round_finalized && !round.is_closed);
  const canFinalizeRound = Boolean(
    round &&
    round.is_active &&
    (round.is_voting_open || round.join_locked) &&
    currentRoundVotes > 0 &&
    !round.round_finalized &&
    !round.is_closed
  );
  const canStartNextRound = Boolean(round && !selectionQuotaReached && round.is_active && round.round_finalized && !round.is_closed);
  const showRoomToggle = Boolean(round && !round.is_closed && !round.join_locked && !round.round_finalized && round.current_round_number === 1);
  const roundStatusLabel = round?.is_closed
    ? "Cerrada"
    : round?.is_voting_open
      ? "Ronda en curso"
      : round?.is_active
        ? "Sala abierta"
        : "Creada";
  const projectionStageLabel = !round
    ? "Proyectando sala de espera"
    : round.is_voting_open
      ? "Proyectando votacion en curso"
      : !round.show_results_to_voters
        ? "Proyectando sala de espera"
        : round.show_final_gallery_projection
          ? "Proyectando ganadores"
          : round.show_ballot_summary_projection
            ? "Proyectando papeletas"
            : "Proyectando resumen";
  const isVotingFinishedAndReviewed = Boolean(
    round &&
    round.round_finalized &&
    (selectionQuotaReached || round.is_closed)
  );

  const workflowActionLabel = !round
    ? "Accion"
    : canOpenRoom
      ? "Abrir sala"
      : !round.round_finalized
        ? canFinalizeRound
          ? "Finalizar ronda"
          : canStartRound
            ? "Iniciar ronda"
            : "Finalizar ronda"
        : (selectionQuotaReached || round.is_closed)
          ? "Votacion completada"
          : !round.show_results_to_voters
            ? "Paso 1: Resultados"
            : !round.show_ballot_summary_projection
              ? "Paso 2: Papeletas"
              : "Siguiente ronda";
  const workflowActionDisabled = Boolean(
    !round ||
    (round.is_closed && !round.round_finalized) ||
    (!round.round_finalized && !canOpenRoom && !canFinalizeRound && !canStartRound) ||
    (round.round_finalized && (
      (selectionQuotaReached || round.is_closed) ||
      (round.show_results_to_voters && round.show_ballot_summary_projection && !canStartNextRound)
    ))
  );
  const workflowActionVariant = !round || workflowActionDisabled || (!round.round_finalized && !canFinalizeRound && !canStartRound && !canOpenRoom)
    ? "secondary"
    : "default";

  const callOpenRoom = async () => {
    if (!roundId || !round) return;

    if (!canOpenRoom) {
      if (roomIsOpen) {
        toast({
          title: "Sala ya abierta",
          description: "La sala esta abierta y ya puede entrar gente con el codigo.",
        });
        return;
      }

      toast({
        title: "No se puede abrir sala",
        description: "Esta votacion no esta en estado valido para abrir sala.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase.rpc("open_round_room", { p_round_id: roundId });
    if (error) {
      toast({ title: "Error", description: "No se pudo abrir la sala", variant: "destructive" });
      return;
    }
    const response = data as { success?: boolean; message?: string };
    if (!response?.success) {
      toast({ title: "No se pudo abrir sala", description: response?.message || "Operacion rechazada", variant: "destructive" });
      return;
    }
    toast({ title: "Sala abierta", description: response.message || "La sala esta abierta" });
    await loadRound();
  };

  const callStartRound = async () => {
    if (!roundId) return;
    const { data, error } = await supabase.rpc("start_voting_round", { p_round_id: roundId });
    if (error) {
      toast({ title: "Error", description: "No se pudo iniciar la ronda", variant: "destructive" });
      return;
    }
    const response = data as { success?: boolean; message?: string };
    if (!response?.success) {
      toast({ title: "No se pudo iniciar", description: response?.message || "Operacion rechazada", variant: "destructive" });
      return;
    }
    toast({ title: "Ronda iniciada", description: response.message || "La ronda esta en curso" });
    await loadRound();
  };

  const callCloseRoom = async () => {
    if (!roundId || !round) return;

    if (!canCloseRoom) {
      toast({
        title: "No se puede cerrar sala",
        description: "La sala solo se puede cerrar cuando esta abierta y la ronda aun no ha empezado.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error: roundUpdateError } = await supabase
        .from("rounds")
        .update({
          is_active: false,
          is_voting_open: false,
          join_locked: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roundId);

      if (roundUpdateError) {
        throw roundUpdateError;
      }

      // Limpiamos asientos para evitar arrastrar conectados de una sala cancelada.
      await supabase
        .from("seats")
        .delete()
        .eq("round_id", roundId);

      toast({
        title: "Sala cerrada",
        description: "La sala se cerro correctamente. Puedes volver a abrirla cuando quieras.",
      });

      await loadRound();
    } catch {
      toast({ title: "Error", description: "No se pudo cerrar la sala", variant: "destructive" });
    }
  };

  const closeVoting = async () => {
    if (!roundId) return;
    const { error } = await supabase
      .from("rounds")
      .update({
        is_closed: true,
        is_active: false,
        is_voting_open: false,
        join_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    if (error) {
      toast({ title: "Error", description: "No se pudo cerrar la votacion", variant: "destructive" });
      return;
    }

    toast({ title: "Votacion cerrada", description: "Se cerro la votacion y se bloqueo la entrada" });
    await loadRound();
  };

  const publishProjectionResults = async () => {
    if (!roundId || !round) return;

    if (!round.round_finalized) {
      toast({
        title: "Ronda no finalizada",
        description: "Primero finaliza la ronda para poder publicar resultados en proyeccion.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("rounds")
      .update({
        show_results_to_voters: true,
        show_ballot_summary_projection: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    if (error) {
      toast({ title: "Error", description: "No se pudo publicar resultados", variant: "destructive" });
      return;
    }

    toast({ title: "Resultados publicados", description: "Paso 1 activado en proyeccion" });
    await loadRound();
  };

  const publishProjectionBallots = async () => {
    if (!roundId || !round) return;

    if (!round.round_finalized) {
      toast({
        title: "Ronda no finalizada",
        description: "Primero finaliza la ronda para poder mostrar papeletas en proyeccion.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("rounds")
      .update({
        show_results_to_voters: true,
        show_ballot_summary_projection: true,
        show_final_gallery_projection: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    if (error) {
      toast({ title: "Error", description: "No se pudo publicar papeletas", variant: "destructive" });
      return;
    }

    toast({ title: "Papeletas publicadas", description: "Paso 2 activado en proyeccion" });
    await loadRound();
  };

  const publishFinalGallery = async () => {
    if (!roundId || !round) return;

    const { error } = await supabase
      .from("rounds")
      .update({
        show_results_to_voters: true,
        show_ballot_summary_projection: true,
        show_final_gallery_projection: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    if (error) {
      toast({ title: "Error", description: "No se pudo publicar la galeria", variant: "destructive" });
      return;
    }

    toast({ title: "Ganadores proyectados", description: "Paso 3 activado en proyeccion" });
    await loadRound();
  };

  const runProjectionWorkflowStep = async () => {
    if (!round) return;

    if (canOpenRoom) {
      await callOpenRoom();
      return;
    }

    if (!round.round_finalized) {
      if (canStartRound) {
        await callStartRound();
        return;
      }

      if (!canFinalizeRound) {
        return;
      }

      await finalizeRound();
      return;
    }

    if (!round.show_results_to_voters) {
      await publishProjectionResults();
      return;
    }

    if (!round.show_ballot_summary_projection) {
      await publishProjectionBallots();
      return;
    }

    if (selectionQuotaReached && !round.show_final_gallery_projection) {
      await publishFinalGallery();
      return;
    }

    await startNextRound();
  };

  const hideAllResults = async () => {
    if (!roundId || !round) return;
    const { error } = await supabase
      .from("rounds")
      .update({
        show_results_to_voters: false,
        show_ballot_summary_projection: false,
        show_final_gallery_projection: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);
    
    if (error) {
      toast({ title: "Error", description: "No se pudo ocultar la proyección", variant: "destructive" });
      return;
    }
    toast({ title: "Proyección ocultada", description: "La pantalla de proyección ahora está en modo espera." });
    await loadRound();
  };

  const toggleFinalResults = async () => {
    if (!roundId || !round || !round.round_finalized) return;

    // Toggle specifically the final gallery projection
    const nextShowGallery = !round.show_final_gallery_projection;
    const { error } = await supabase
      .from("rounds")
      .update({
        show_results_to_voters: true,
        show_ballot_summary_projection: true,
        show_final_gallery_projection: nextShowGallery,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar la galería final", variant: "destructive" });
      return;
    }

    toast({
      title: nextShowGallery ? "Resultados finales publicados" : "Resultados finales ocultados",
      description: nextShowGallery ? "🎉🎉🎉 Proyectando ganadores" : "Se ocultaron los resultados finales",
    });
    await loadRound();
  };

  const pauseRound = async () => {
    if (!roundId || !canPauseRound) return;

    const { error } = await supabase
      .from("rounds")
      .update({
        is_voting_open: false,
        is_active: true,
        join_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    if (error) {
      toast({ title: "Error", description: "No se pudo pausar la ronda", variant: "destructive" });
      return;
    }

    toast({ title: "Ronda en pausa", description: "La votacion quedo pausada temporalmente" });
    await loadRound();
  };

  const resumeRound = async () => {
    if (!roundId || !canResumeRound) return;

    const { error } = await supabase
      .from("rounds")
      .update({
        is_voting_open: true,
        is_active: true,
        join_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    if (error) {
      toast({ title: "Error", description: "No se pudo reanudar la ronda", variant: "destructive" });
      return;
    }

    toast({ title: "Ronda reanudada", description: "La votacion vuelve a estar en curso" });
    await loadRound();
  };

  const finalizeRound = async () => {
    if (!roundId || !round || !canFinalizeRound) return;

    if (round.census_mode === "exact" && currentRoundVotes < round.max_votantes) {
      toast({
        title: "Censo exacto incompleto",
        description: `Faltan ${round.max_votantes - currentRoundVotes} votos para finalizar la ronda.`,
        variant: "destructive",
      });
      return;
    }

    const { error: processError } = await supabase.rpc("process_round_results", {
      p_round_id: roundId,
      p_round_number: round.current_round_number,
    });

    if (processError) {
      toast({ title: "Error", description: "No se pudo finalizar la ronda", variant: "destructive" });
      return;
    }

    const { error: updateError } = await supabase
      .from("rounds")
      .update({
        round_finalized: true,
        show_results_to_voters: false,
        show_ballot_summary_projection: false,
        is_voting_open: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    if (updateError) {
      toast({ title: "Error", description: "No se pudo cerrar la ronda actual", variant: "destructive" });
      return;
    }

    toast({ title: "Ronda finalizada", description: "Ya puedes publicar resultados o iniciar la siguiente ronda" });
    await loadRound();
  };

  const startNextRound = async () => {
    if (!roundId || !canStartNextRound) return;

    const { data, error } = await supabase.rpc("start_new_round", { p_round_id: roundId });
    if (error) {
      toast({ title: "Error", description: "No se pudo iniciar la siguiente ronda", variant: "destructive" });
      return;
    }

    const parsed = data as { round_number?: number };

    await supabase
      .from("rounds")
      .update({
        is_active: true,
        round_finalized: false,
        is_voting_open: true,
        join_locked: true,
        show_results_to_voters: false,
        show_ballot_summary_projection: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    toast({ title: "Siguiente ronda iniciada", description: `Ronda ${parsed?.round_number || "nueva"} en curso` });
    await loadRound();
  };

  const saveConfig = async () => {
    if (!roundId || !round) return;

    setSavingConfig(true);
    try {
      const normalizedCode = configAccessCode.trim().toUpperCase();
      const nextAccessCode = ACCESS_CODE_REGEX.test(normalizedCode) ? normalizedCode : generateAccessCode();
      if (nextAccessCode !== normalizedCode) {
        setConfigAccessCode(nextAccessCode);
      }

      const { error } = await supabase
        .from("rounds")
        .update({
          access_code: nextAccessCode,
          census_mode: configCensusMode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roundId);

      if (error) {
        throw error;
      }

      toast({ title: "Configuracion guardada", description: "Se actualizaron los ajustes de la votacion" });
      await loadRound();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar la configuracion", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const exportBallotsCsv = async () => {
    if (!round || !roundId || !round.is_closed) {
      return;
    }

    const { data, error } = await supabase
      .from("votes")
      .select("round_number,vote_hash,created_at,is_invalidated,invalidation_reason,candidate:candidates(name,surname)")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Error", description: "No se pudo exportar el CSV", variant: "destructive" });
      return;
    }

    const rows = (data || []) as unknown as VoteExportRow[];
    const grouped = new Map<string, VoteExportRow[]>();

    for (const row of rows) {
      const key = `${row.round_number}|${row.vote_hash || `${row.created_at}-${Math.random().toString(36).slice(2, 8)}`}`;
      const list = grouped.get(key) || [];
      list.push(row);
      grouped.set(key, list);
    }

    const header = [
      "votacion",
      "ronda",
      "codigo_papeleta",
      "voto_1",
      "voto_2",
      "voto_3",
      "en_blanco",
      "timestamp",
      "estado",
    ];

    const csvLines = [header.map(csvEscape).join(",")];

    for (const [, ballotRows] of grouped) {
      const sorted = ballotRows.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const votes = sorted.map((item) => {
        const candidate = normalizeVoteCandidate(item.candidate);
        if (!candidate) {
          return "-";
        }
        return `${candidate.name} ${candidate.surname}`.trim();
      });

      while (votes.length < 3) {
        votes.push("-");
      }

      const hasInvalidated = sorted.some((item) => item.is_invalidated);
      const first = sorted[0];
      const line = [
        round.title,
        String(first.round_number),
        shortBallotCode(first.vote_hash),
        votes[0] || "-",
        votes[1] || "-",
        votes[2] || "-",
        votes.filter((vote) => vote === "-").length > 0 ? "true" : "false",
        first.created_at,
        hasInvalidated ? "invalidada" : "valida",
      ];
      csvLines.push(line.map((field) => csvEscape(field)).join(","));
    }

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `papeletas_${round.title.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "CSV exportado", description: "Se descargo el resumen de papeletas" });
  };

  const resetCandidateForm = () => {
    setCandidateForm({
      name: "",
      surname: "",
      location: "",
      group_name: "",
      age: "",
      description: "",
      image_url: "",
    });
  };

  const openAddCandidateDialog = () => {
    setEditingCandidate(null);
    resetCandidateForm();
    setIsAddCandidateOpen(true);
  };

  const openEditCandidateDialog = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setCandidateForm({
      name: candidate.name,
      surname: candidate.surname,
      location: candidate.location || "",
      group_name: candidate.group_name || "",
      age: candidate.age || "",
      description: candidate.description || "",
      image_url: candidate.image_url || "",
    });
    setIsEditCandidateOpen(true);
  };

  const addCandidate = async () => {
    if (!round) return;

    if (!candidateForm.name.trim() || !candidateForm.surname.trim()) {
      toast({ title: "Campos obligatorios", description: "El nombre y apellido son obligatorios", variant: "destructive" });
      return;
    }

    const maxOrderIndex = Math.max(0, ...candidates.map((candidate) => candidate.order_index || 0));

    const { error } = await supabase
      .from("candidates")
      .insert([{
        round_id: round.id,
        name: candidateForm.name.trim(),
        surname: candidateForm.surname.trim(),
        location: candidateForm.location.trim() || null,
        group_name: candidateForm.group_name.trim() || null,
        age: typeof candidateForm.age === "number" ? candidateForm.age : null,
        description: candidateForm.description.trim() || null,
        image_url: candidateForm.image_url.trim() || null,
        order_index: maxOrderIndex + 1,
      }]);

    if (error) {
      toast({ title: "Error", description: "No se pudo anadir el candidato", variant: "destructive" });
      return;
    }

    toast({ title: "Candidato anadido", description: "El candidato se guardo correctamente" });
    setIsAddCandidateOpen(false);
    resetCandidateForm();
    await loadRound();
  };

  const updateCandidate = async () => {
    if (!editingCandidate) return;

    if (!candidateForm.name.trim() || !candidateForm.surname.trim()) {
      toast({ title: "Campos obligatorios", description: "El nombre y apellido son obligatorios", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("candidates")
      .update({
        name: candidateForm.name.trim(),
        surname: candidateForm.surname.trim(),
        location: candidateForm.location.trim() || null,
        group_name: candidateForm.group_name.trim() || null,
        age: typeof candidateForm.age === "number" ? candidateForm.age : null,
        description: candidateForm.description.trim() || null,
        image_url: candidateForm.image_url.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingCandidate.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo editar el candidato", variant: "destructive" });
      return;
    }

    toast({ title: "Candidato actualizado", description: "Los cambios se guardaron correctamente" });
    setIsEditCandidateOpen(false);
    setEditingCandidate(null);
    resetCandidateForm();
    await loadRound();
  };

  const deleteCandidate = async (candidateId: string) => {
    const confirmed = window.confirm("¿Seguro que quieres eliminar este candidato?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", candidateId);

    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar el candidato", variant: "destructive" });
      return;
    }

    toast({ title: "Candidato eliminado", description: "El candidato se elimino correctamente" });
    await loadRound();
  };

  const parseCSV = (text: string): ImportCandidate[] => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((header) => header.trim());

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((value) => value.trim());
      const candidate: ImportCandidate = {
        name: "",
        surname: "",
        location: "",
        group_name: "",
        age: null,
        description: "",
        image_url: "",
      };

      headers.forEach((header, index) => {
        const value = values[index] || "";
        if (header === "age") {
          candidate.age = value ? Number(value) : null;
        } else if (header in candidate) {
          (candidate as Record<string, string | number | null>)[header] = value;
        }
      });

      return candidate;
    });
  };

  const parseXML = (text: string): ImportCandidate[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    const parsedCandidates = xmlDoc.getElementsByTagName("candidate");

    return Array.from(parsedCandidates).map((candidate) => {
      const getTagValue = (tagName: string) => {
        const element = candidate.getElementsByTagName(tagName)[0];
        return element ? element.textContent || "" : "";
      };

      return {
        name: getTagValue("name"),
        surname: getTagValue("surname"),
        location: getTagValue("location"),
        group_name: getTagValue("group_name"),
        age: getTagValue("age") ? Number(getTagValue("age")) : null,
        description: getTagValue("description"),
        image_url: getTagValue("image_url"),
      };
    });
  };

  const parseJSON = (text: string): ImportCandidate[] => {
    const payload = JSON.parse(text);
    return payload.candidates || payload;
  };

  const importCandidates = async (file: File) => {
    if (!round) return;

    try {
      setImportingFile(true);
      const text = await file.text();
      let candidatesData: ImportCandidate[] = [];

      if (file.name.endsWith(".csv")) {
        candidatesData = parseCSV(text);
      } else if (file.name.endsWith(".xml")) {
        candidatesData = parseXML(text);
      } else if (file.name.endsWith(".json")) {
        candidatesData = parseJSON(text);
      } else {
        throw new Error("Formato no soportado. Usa CSV, XML o JSON.");
      }

      const maxOrderIndex = Math.max(0, ...candidates.map((candidate) => candidate.order_index || 0));
      let importedCount = 0;
      let errorCount = 0;

      for (let index = 0; index < candidatesData.length; index += 1) {
        const candidate = candidatesData[index];
        if (!candidate.name?.trim() || !candidate.surname?.trim()) {
          errorCount += 1;
          continue;
        }

        const { error } = await supabase
          .from("candidates")
          .insert([{
            round_id: round.id,
            name: candidate.name.trim(),
            surname: candidate.surname.trim(),
            location: candidate.location?.trim() || null,
            group_name: candidate.group_name?.trim() || null,
            age: typeof candidate.age === "number" ? candidate.age : null,
            description: candidate.description?.trim() || null,
            image_url: candidate.image_url?.trim() || null,
            order_index: maxOrderIndex + index + 1,
          }]);

        if (error) {
          errorCount += 1;
        } else {
          importedCount += 1;
        }
      }

      toast({
        title: "Importacion completada",
        description: `${importedCount} candidatos importados${errorCount > 0 ? `. ${errorCount} filas con error.` : "."}`,
      });

      setIsImportOpen(false);
      await loadRound();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo importar el archivo",
        variant: "destructive",
      });
    } finally {
      setImportingFile(false);
    }
  };

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importCandidates(file);
      event.target.value = "";
    }
  };

  const loadDataset = async () => {
    if (!round) return;
    const selectedDataset = testDatasets.find((dataset) => dataset.id === selectedDatasetId);

    if (!selectedDataset) {
      toast({ title: "Dataset no valido", description: "Selecciona un dataset para importar", variant: "destructive" });
      return;
    }

    try {
      setLoadingDataset(true);

      const maxOrderIndex = Math.max(0, ...candidates.map((candidate) => candidate.order_index || 0));
      const rows = selectedDataset.candidates.map((candidate, index) => ({
        round_id: round.id,
        name: candidate.name.trim(),
        surname: candidate.surname.trim(),
        location: candidate.location?.trim() || null,
        group_name: candidate.group_name?.trim() || null,
        age: typeof candidate.age === "number" ? candidate.age : null,
        description: candidate.description?.trim() || null,
        image_url: candidate.image_url?.trim() || null,
        order_index: maxOrderIndex + index + 1,
      }));

      const { error } = await supabase
        .from("candidates")
        .insert(rows);

      if (error) {
        throw error;
      }

      toast({ title: "Dataset importado", description: `${rows.length} candidatos añadidos` });
      setIsDatasetOpen(false);
      await loadRound();
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el dataset", variant: "destructive" });
    } finally {
      setLoadingDataset(false);
    }
  };

  const openComunicaImport = () => {
    if (!round) return;
    navigate(`/comunica?round=${round.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!round) {
    return (
      <Card className="admin-shell mx-auto max-w-2xl">
        <CardContent className="py-8 text-center">
          No se encontro la votacion solicitada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="admin-canvas min-h-screen bg-slate-50/30 dark:bg-background">
      <div className="container mx-auto max-w-screen-2xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-outline-variant/30 pb-6 dark:border-border">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/dashboard")} className="h-8 rounded-full"> 
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a votaciones
              </Button>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full border px-2.5 py-1 font-medium ${
                    roomIsOpen
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "border-outline-variant/60 bg-surface-container-lowest/90 dark:border-outline-variant/70 dark:bg-surface-container-low/90 text-foreground"
                  }`}
                >
                  {roundStatusLabel}
                </span>
                <span className="admin-chip">Ronda {round.current_round_number}</span>
                <Badge variant="outline" className="font-normal border-outline-variant/40 opacity-80 rounded-full px-2 py-0.5">
                  Proyeccion: {projectionStageLabel}
                </Badge>
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{round.title}</h1>
              {round.description && <p className="text-sm md:text-base text-muted-foreground mt-1 max-w-2xl">{round.description}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setIsAnalyticsOpen(true)} className="rounded-xl border-outline-variant/60 bg-surface-container-lowest/90 hover:bg-muted/50">
              Analisis
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsBallotsOpen(true)} className="rounded-xl border-outline-variant/60 bg-surface-container-lowest/90 hover:bg-muted/50">
              Papeletas
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsSettingsOpen(true)} className="rounded-xl border-outline-variant/60 bg-surface-container-lowest/90 hover:bg-muted/50">
              <Settings2 className="w-4 h-4 mr-2" />
              Ajustes
            </Button>
            <Button
              size="sm"
              asChild
              className="h-9 justify-between rounded-xl px-4 text-white shadow-[0_12px_24px_-12px_rgba(37,99,235,0.7)]"
            >
              <a href="/proyeccion" target="_blank" rel="noreferrer" className="font-semibold">
                Ir a proyeccion
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </header>

        {/* Dashboard Upper Section: KPIs and Controls */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-8 xl:col-span-9 grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
            <Card className="rounded-2xl shadow-sm border-outline-variant/40 bg-surface-container-lowest/50 dark:bg-surface-container-low/20">
              <CardContent className="p-4 flex flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Equipo</p>
                <p className="text-xl font-bold text-foreground">{round.team}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm border-outline-variant/40 bg-surface-container-lowest/50 dark:bg-surface-container-low/20">
              <CardContent className="p-4 flex flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Cupo</p>
                <p className="text-xl font-bold text-foreground">{round.max_votantes}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm border-outline-variant/40 bg-surface-container-lowest/50 dark:bg-surface-container-low/20">
              <CardContent className="p-4 flex flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Conectados</p>
                <p className="text-xl font-bold text-foreground">{seatStatus?.occupied_seats ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm border-outline-variant/40 bg-surface-container-lowest/50 dark:bg-surface-container-low/20">
              <CardContent className="p-4 flex flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Activos</p>
                <p className="text-xl font-bold text-foreground">{activeCandidatesCount}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm border-outline-variant/40 bg-surface-container-lowest/50 dark:bg-surface-container-low/20">
              <CardContent className="p-4 flex flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Codigo sala</p>
                <p className="text-xl font-mono font-bold text-foreground">{round.access_code || "----"}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm border-outline-variant/40 bg-surface-container-lowest/50 dark:bg-surface-container-low/20">
              <CardContent className="p-4 flex flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Censo</p>
                <p className="text-xl font-bold text-foreground capitalize">{round.census_mode === "exact" ? "Exacto" : "Maximo"}</p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="rounded-2xl shadow-md border-outline-variant/60 bg-surface-container-lowest/90 dark:bg-surface-container-low/60 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardContent className="p-5 space-y-3 relative z-10">
                <div className="flex items-center justify-between mb-1 text-sm">
                  <h3 className="font-semibold text-foreground">Control de Votacion</h3>
                </div>
                <Button
                  size="default"
                  className={`h-11 w-full justify-center rounded-xl px-4 text-sm font-semibold transition-all ${
                    workflowActionVariant === "default"
                      ? "text-white shadow-[0_8px_16px_-8px_rgba(37,99,235,0.6)]"
                      : "border border-outline-variant/60 bg-surface-container-lowest/90 text-foreground hover:bg-muted/50"
                  }`}
                  variant={workflowActionVariant}
                  onClick={runProjectionWorkflowStep}
                  disabled={workflowActionDisabled}
                >
                  {(workflowActionLabel === "Iniciar ronda" || workflowActionLabel === "Abrir sala") ? (
                    <Play className="w-4 h-4 mr-2" />
                  ) : (
                    <StepForward className="w-4 h-4 mr-2" />
                  )}
                  {workflowActionLabel}
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl h-9 border-outline-variant/60 text-xs font-medium"
                    variant="outline"
                    onClick={canPauseRound ? pauseRound : resumeRound}
                    disabled={!canPauseRound && !canResumeRound}
                  >
                    <Pause className="w-3.5 h-3.5 mr-1.5" />
                    {canPauseRound ? "Pausar" : "Reanudar"}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl h-9 text-xs font-medium hover:bg-destructive/90 hover:text-white"
                    variant="ghost"
                    onClick={closeVoting}
                    disabled={round.is_closed}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    Cerrar
                  </Button>
                </div>

                {isVotingFinishedAndReviewed && (
                  <div className="mt-4 pt-5 border-t border-outline-variant/30 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="gallery-projection" className="text-sm font-semibold flex items-center">
                          <Sparkles className="w-4 h-4 mr-1.5 text-primary" />
                          Pantalla de Resultados
                        </Label>
                        <span className="text-[11px] text-muted-foreground">Proyectar estado final en pantalla</span>
                      </div>
                      <Switch
                        id="gallery-projection"
                        checked={Boolean(round.show_final_gallery_projection)}
                        onCheckedChange={toggleFinalResults}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </div>
                )}
                
                {/* Reset Projection */}
                <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-end">
                  <Button variant="outline" size="sm" onClick={hideAllResults} className="w-full text-xs hover:bg-destructive/10 hover:text-destructive">
                    <MonitorOff className="w-4 h-4 mr-1.5" />
                    Apagar Proyección (Volver a Espera)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lists Section: Candidates & Seats */}
        <section className="grid gap-8 lg:grid-cols-12 pt-4">
          
          <div className="lg:col-span-8 xl:col-span-9 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 dark:border-border pb-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Candidatos</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Seleccionados: <span className="font-medium">{selectedCandidatesCount}</span> / Activos: <span className="font-medium">{activeCandidatesCount}</span></p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={openAddCandidateDialog} className="rounded-xl h-9 shadow-sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Añadir
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setIsImportOpen(true)} className="rounded-xl h-9 shadow-sm bg-surface-container-lowest border border-outline-variant/30 hover:bg-muted/50">
                  <FileUp className="w-4 h-4 mr-2 text-muted-foreground" />
                  Importar
                </Button>
                <Button size="sm" variant="secondary" onClick={openComunicaImport} className="rounded-xl h-9 shadow-sm bg-surface-container-lowest border border-outline-variant/30 hover:bg-muted/50">
                  <ArrowUpRight className="w-4 h-4 mr-2 text-muted-foreground" />
                  Comunica
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setIsDatasetOpen(true)} className="rounded-xl h-9 shadow-sm bg-surface-container-lowest border border-outline-variant/30 hover:bg-muted/50">
                  <Download className="w-4 h-4 mr-2 text-muted-foreground" />
                  Dataset
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest/80 dark:border-outline-variant/50 dark:bg-surface-container-low/40 shadow-sm">
              {candidates.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground flex flex-col items-center">
                  <UserPlus className="w-8 h-8 mb-3 opacity-20" />
                  <p>Todavía no hay candidatos.</p>
                  <p className="text-xs mt-1">Usa Añadir o Importar para comenzar.</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/20 dark:divide-outline-variant/30">
                  {candidates.map((candidate) => (
                    <div key={candidate.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/30 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{candidate.name} {candidate.surname}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {candidate.location || "Sin ubicacion"} {candidate.group_name ? `• ${candidate.group_name}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        {candidate.is_selected && <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Seleccionado</Badge>}
                        {candidate.is_eliminated && <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent">Eliminado</Badge>}
                        <div className="flex items-center ml-2 border-l border-outline-variant/30 pl-2">
                          <Button size="icon" variant="ghost" onClick={() => openEditCandidateDialog(candidate)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteCandidate(candidate.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 xl:col-span-3 space-y-5">
            <div className="border-b border-outline-variant/30 dark:border-border pb-4">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Conexiones</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Estado de la sala</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Card className="rounded-xl shadow-sm border-outline-variant/30 bg-surface-container-lowest/50 text-center py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ocupados</p>
                <p className="font-bold text-base mt-0.5">{seatStatus?.occupied_seats ?? 0}</p>
              </Card>
              <Card className="rounded-xl shadow-sm border-outline-variant/30 bg-surface-container-lowest/50 text-center py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Disponibles</p>
                <p className="font-bold text-base mt-0.5">{seatStatus?.available_seats ?? 0}</p>
              </Card>
              <Card className="rounded-xl shadow-sm border-outline-variant/30 bg-surface-container-lowest/50 text-center py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Expirados</p>
                <p className="font-bold text-base mt-0.5">{seatStatus?.expired_seats ?? 0}</p>
              </Card>
              <Card className="rounded-xl shadow-sm border-outline-variant/30 bg-surface-container-lowest/50 text-center py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Entrada</p>
                <p className="font-bold text-base mt-0.5">{round.join_locked ? "Bloqueada" : "Abierta"}</p>
              </Card>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-2xl border border-outline-variant/40 bg-surface-container-lowest/80 dark:border-outline-variant/50 dark:bg-surface-container-low/40 shadow-sm scrollbar-thin">
              {seats.length === 0 ? (
                <p className="p-5 text-center text-sm text-muted-foreground">Sin conexiones registradas.</p>
              ) : (
                <div className="divide-y divide-outline-variant/20 dark:divide-outline-variant/30">
                  {seats.map((seat) => (
                    <div key={seat.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs hover:bg-muted/30 transition-colors">
                      <span className="font-mono text-muted-foreground">{seat.browser_instance_id.slice(0, 8)}...</span>
                      <Badge 
                        variant="outline" 
                        className={`px-1.5 py-0 text-[10px] font-medium border-transparent ${
                          seat.estado === "ocupado" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : 
                          seat.estado === "expirado" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {seat.estado}
                      </Badge>
                      <span className="text-muted-foreground/70">{new Date(seat.last_seen_at).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Dialogs and Modals */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="admin-shell max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuracion de la votacion</DialogTitle>
            <DialogDescription>Actualiza codigo de acceso, censo y panel de papeletas en proyeccion.</DialogDescription>
          </DialogHeader>
          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="access_code_detail">Codigo de acceso</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="access_code_detail"
                    value={configAccessCode}
                    maxLength={4}
                    placeholder="A1B2"
                    className="font-mono"
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfigAccessCode(generateAccessCode())}
                    className="shrink-0"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Siempre aleatorio: 4 caracteres alfanumericos.</p>
              </div>

              <div className="space-y-2">
                <Label>Modo de censo</Label>
                <Select value={configCensusMode} onValueChange={(value: "maximum" | "exact") => setConfigCensusMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maximum">Maximum (inicio manual)</SelectItem>
                    <SelectItem value="exact">Exact (conectados == cupo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={saveConfig} disabled={savingConfig}>
                {savingConfig ? "Guardando..." : "Guardar configuracion"}
              </Button>
            </div>
          </section>
        </DialogContent>
      </Dialog>

      {isAnalyticsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--backdrop)/0.6)] p-4 backdrop-blur-sm" onClick={() => setIsAnalyticsOpen(false)}>
          <div className="h-[90vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest/92 shadow-tech dark:border-outline-variant/65 dark:bg-surface-container-low/88" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Análisis de resultados</h3>
              <Button size="sm" variant="ghost" onClick={() => setIsAnalyticsOpen(false)}>Cerrar</Button>
            </div>
            <div className="h-[calc(90vh-57px)] overflow-auto p-4">
              <ResultsAnalytics lockedRoundId={round.id} />
            </div>
          </div>
        </div>
      )}

      {isBallotsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--backdrop)/0.6)] p-4 backdrop-blur-sm" onClick={() => setIsBallotsOpen(false)}>
          <div className="h-[90vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest/92 shadow-tech dark:border-outline-variant/65 dark:bg-surface-container-low/88" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Revisión de papeletas</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={exportBallotsCsv} disabled={!round.is_closed}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsBallotsOpen(false)}>Cerrar</Button>
              </div>
            </div>
            <div className="h-[calc(90vh-57px)] overflow-auto p-4">
              <BallotReview lockedRoundId={round.id} showHeader={false} />
            </div>
          </div>
        </div>
      )}

      <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
        <DialogContent className="admin-shell max-w-xl">
          <DialogHeader>
            <DialogTitle>Añadir candidato</DialogTitle>
            <DialogDescription>Completa los datos principales del candidato.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={candidateForm.name} onChange={(event) => setCandidateForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido</Label>
                <Input value={candidateForm.surname} onChange={(event) => setCandidateForm((prev) => ({ ...prev, surname: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Ubicacion</Label>
                <Input value={candidateForm.location} onChange={(event) => setCandidateForm((prev) => ({ ...prev, location: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Grupo</Label>
                <Input value={candidateForm.group_name} onChange={(event) => setCandidateForm((prev) => ({ ...prev, group_name: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripcion</Label>
              <Textarea value={candidateForm.description} onChange={(event) => setCandidateForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddCandidateOpen(false)}>Cancelar</Button>
              <Button onClick={addCandidate}>Guardar candidato</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCandidateOpen} onOpenChange={setIsEditCandidateOpen}>
        <DialogContent className="admin-shell max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar candidato</DialogTitle>
            <DialogDescription>Actualiza los datos del candidato seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={candidateForm.name} onChange={(event) => setCandidateForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido</Label>
                <Input value={candidateForm.surname} onChange={(event) => setCandidateForm((prev) => ({ ...prev, surname: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Ubicacion</Label>
                <Input value={candidateForm.location} onChange={(event) => setCandidateForm((prev) => ({ ...prev, location: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Grupo</Label>
                <Input value={candidateForm.group_name} onChange={(event) => setCandidateForm((prev) => ({ ...prev, group_name: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripcion</Label>
              <Textarea value={candidateForm.description} onChange={(event) => setCandidateForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditCandidateOpen(false)}>Cancelar</Button>
              <Button onClick={updateCandidate}>Guardar cambios</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="admin-shell max-w-xl">
          <DialogHeader>
            <DialogTitle>Importar candidatos</DialogTitle>
            <DialogDescription>Sube un archivo CSV, XML o JSON con los candidatos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {importingFile && <p className="text-sm text-muted-foreground">Importando candidatos...</p>}
            <Input type="file" accept=".csv,.xml,.json" onChange={handleFileImport} disabled={importingFile} />
            <p className="text-xs text-muted-foreground">Usa los ejemplos del proyecto (Mundial de desayunos) para el formato.</p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cerrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDatasetOpen} onOpenChange={setIsDatasetOpen}>
        <DialogContent className="admin-shell max-w-xl">
          <DialogHeader>
            <DialogTitle>Cargar dataset de ejemplo</DialogTitle>
            <DialogDescription>Inserta un dataset predefinido para pruebas rapidas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un dataset" />
                </SelectTrigger>
                <SelectContent>
                  {testDatasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.emoji} {dataset.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDatasetOpen(false)} disabled={loadingDataset}>Cancelar</Button>
              <Button onClick={loadDataset} disabled={loadingDataset}>{loadingDataset ? "Cargando..." : "Insertar dataset"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
