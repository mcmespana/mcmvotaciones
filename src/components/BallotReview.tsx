import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { FileText, XCircle, Eye, AlertTriangle } from "lucide-react";

interface BallotReviewProps {
  lockedRoundId?: string;
  showHeader?: boolean;
}

interface Vote {
  id: string;
  round_id: string;
  candidate_id: string;
  device_hash: string;
  vote_hash: string | null;
  round_number: number;
  is_invalidated: boolean;
  invalidation_reason: string | null;
  invalidated_at: string | null;
  created_at: string;
  candidate?: {
    name: string;
    surname: string;
    location: string | null;
  } | Array<{
    name: string;
    surname: string;
    location: string | null;
  }>;
}

const normalizeCandidate = (candidate: Vote["candidate"]) =>
  Array.isArray(candidate) ? candidate[0] : candidate;

interface Round {
  id: string;
  title: string;
  current_round_number: number;
}

export function BallotReview({ lockedRoundId, showHeader = true }: BallotReviewProps) {
  const { toast } = useToast();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [selectedRoundNum, setSelectedRoundNum] = useState<number>(1);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [invalidateDialogOpen, setInvalidateDialogOpen] = useState(false);
  const [selectedVoteId, setSelectedVoteId] = useState<string>("");
  const [invalidateReason, setInvalidateReason] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState("");

  const loadRounds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("rounds")
        .select("id, title, current_round_number")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = data || [];
      setRounds(rows);
      if (lockedRoundId) {
        const target = rows.find((round) => round.id === lockedRoundId);
        if (target) {
          setSelectedRoundId(target.id);
          setSelectedRoundNum(target.current_round_number || 1);
        }
      } else if (rows.length > 0 && !selectedRoundId) {
        setSelectedRoundId(rows[0].id);
      }
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las votaciones", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [lockedRoundId, toast, selectedRoundId]);

  const loadVotes = useCallback(async () => {
    if (!selectedRoundId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("votes")
        .select(`
          id, round_id, candidate_id, device_hash, vote_hash, round_number,
          is_invalidated, invalidation_reason, invalidated_at, created_at,
          candidate:candidates (name, surname, location)
        `)
        .eq("round_id", selectedRoundId)
        .eq("round_number", selectedRoundNum)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setVotes(data || []);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los votos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedRoundId, selectedRoundNum, toast]);

  useEffect(() => { loadRounds(); }, [loadRounds]);
  useEffect(() => { loadVotes(); }, [loadVotes]);

  const invalidateVote = async () => {
    if (!selectedVoteId || !invalidateReason.trim()) {
      toast({ title: "Error", description: "Debes especificar un motivo", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("votes")
        .update({
          is_invalidated: true,
          invalidation_reason: invalidateReason.trim(),
          invalidated_at: new Date().toISOString(),
        })
        .eq("id", selectedVoteId);

      if (error) throw error;

      toast({ title: "Voto invalidado", description: "El voto ha sido marcado como inválido" });
      setInvalidateDialogOpen(false);
      setInvalidateReason("");
      setSelectedVoteId("");
      loadVotes();
    } catch {
      toast({ title: "Error", description: "No se pudo invalidar el voto", variant: "destructive" });
    }
  };

  const restoreVote = async (voteId: string) => {
    try {
      const { error } = await supabase
        .from("votes")
        .update({
          is_invalidated: false,
          invalidation_reason: null,
          invalidated_at: null,
        })
        .eq("id", voteId);

      if (error) throw error;
      toast({ title: "Voto restaurado", description: "El voto ha sido restaurado" });
      loadVotes();
    } catch {
      toast({ title: "Error", description: "No se pudo restaurar el voto", variant: "destructive" });
    }
  };

  // Group votes by device_hash to see "ballots"
  const ballots = new Map<string, Vote[]>();
  for (const vote of votes) {
    const hash = vote.device_hash;
    if (!ballots.has(hash)) ballots.set(hash, []);
    ballots.get(hash)!.push(vote);
  }

  const filteredBallots = ballots;

  const totalBallots = filteredBallots.size;
  const invalidatedCount = votes.filter((v) => v.is_invalidated).length;

  const selectedRound = rounds.find((r) => r.id === selectedRoundId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {showHeader ? (
          <div className="flex items-center flex-wrap gap-3">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Revisión de Papeletas
            </h2>
            <Badge variant="outline">{totalBallots} papeletas</Badge>
            <Badge variant="outline">{votes.length} votos individuales</Badge>
            {invalidatedCount > 0 && (
              <Badge variant="destructive">{invalidatedCount} invalidados</Badge>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="outline">{totalBallots} papeletas</Badge>
            <Badge variant="outline">{votes.length} votos individuales</Badge>
            {invalidatedCount > 0 && (
              <Badge variant="destructive">{invalidatedCount} invalidados</Badge>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          {!lockedRoundId && (
            <Select value={selectedRoundId} onValueChange={(v) => { setSelectedRoundId(v); setSelectedRoundNum(1); }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Seleccionar votación" />
              </SelectTrigger>
              <SelectContent>
                {rounds.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedRound && selectedRound.current_round_number > 1 && (
            <Select value={String(selectedRoundNum)} onValueChange={(v) => setSelectedRoundNum(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: selectedRound.current_round_number }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>Ronda {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Ballots list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(filteredBallots.entries()).map(([deviceHash, deviceVotes], ballotIndex) => {
            const isAnyInvalidated = deviceVotes.some((v) => v.is_invalidated);
            const allInvalidated = deviceVotes.every((v) => v.is_invalidated);
            const votedAt = new Date(deviceVotes[0].created_at);

            return (
              <Card
                key={deviceHash}
                className={`transition-colors ${
                  allInvalidated
                    ? "border-destructive/30 bg-destructive/5"
                    : isAnyInvalidated
                    ? "border-yellow-500/30"
                    : ""
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Papeleta #{ballotIndex + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {votedAt.toLocaleString("es-ES")}
                        </span>
                        {deviceVotes[0].vote_hash && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {deviceVotes[0].vote_hash.slice(0, 8).toUpperCase()}
                          </Badge>
                        )}
                        {allInvalidated && (
                          <Badge variant="destructive" className="text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Invalidado
                          </Badge>
                        )}
                      </div>

                      {/* Candidates voted for */}
                      <div className="flex flex-wrap gap-2">
                        {deviceVotes.map((v) => (
                          <Badge
                            key={v.id}
                            variant={v.is_invalidated ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {normalizeCandidate(v.candidate)
                              ? `${normalizeCandidate(v.candidate)!.name} ${normalizeCandidate(v.candidate)!.surname}`
                              : v.candidate_id.slice(0, 8)}
                            {v.is_invalidated && " ✗"}
                          </Badge>
                        ))}
                      </div>

                      {/* Invalidation reason */}
                      {deviceVotes.some((v) => v.invalidation_reason) && (
                        <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {deviceVotes.find((v) => v.invalidation_reason)?.invalidation_reason}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDetailDevice(deviceHash);
                          setDetailDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!allInvalidated ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            // Invalidate all votes from this device
                            setSelectedVoteId(deviceVotes[0].id);
                            setInvalidateDialogOpen(true);
                          }}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-green-600">
                              Restaurar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Restaurar papeleta?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se restaurarán todos los votos de este dispositivo.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  deviceVotes.forEach((v) => restoreVote(v.id));
                                }}
                              >
                                Restaurar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredBallots.size === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay papeletas para mostrar</p>
            </div>
          )}
        </div>
      )}

      {/* Invalidate Dialog */}
      <Dialog open={invalidateDialogOpen} onOpenChange={setInvalidateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invalidar Papeleta</DialogTitle>
            <DialogDescription>
              Especifica el motivo de la invalidación. Esta acción es reversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={invalidateReason}
              onChange={(e) => setInvalidateReason(e.target.value)}
              placeholder="Motivo de la invalidación..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInvalidateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={invalidateVote} disabled={!invalidateReason.trim()}>
                Invalidar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de Papeleta</DialogTitle>
            <DialogDescription className="font-mono text-xs break-all">
              Device: {detailDevice}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {ballots.get(detailDevice)?.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {normalizeCandidate(v.candidate)
                      ? `${normalizeCandidate(v.candidate)!.name} ${normalizeCandidate(v.candidate)!.surname}`
                      : v.candidate_id}
                  </p>
                  {normalizeCandidate(v.candidate)?.location && (
                    <p className="text-xs text-muted-foreground">📍 {normalizeCandidate(v.candidate)!.location}</p>
                  )}
                </div>
                <div className="text-right">
                  {v.is_invalidated ? (
                    <Badge variant="destructive" className="text-xs">Inválido</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Válido</Badge>
                  )}
                  {v.vote_hash && (
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {v.vote_hash.slice(0, 8).toUpperCase()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
