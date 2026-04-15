import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { generateAccessCode } from "@/lib/accessCode";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Plus, Vote, Users } from "lucide-react";

interface RoundListItem {
  id: string;
  title: string;
  description: string | null;
  year: number;
  team: "ECE" | "ECL";
  max_votantes: number;
  is_active: boolean;
  is_closed: boolean;
  is_voting_open: boolean;
  join_locked: boolean;
  current_round_number: number;
  votes_current_round: number;
  created_at: string;
}

interface NewRoundForm {
  title: string;
  description: string;
  year: number;
  team: "ECE" | "ECL";
  max_votantes: number;
  census_mode: "maximum" | "exact";
}

function getStatusBadge(round: RoundListItem) {
  if (round.is_closed) {
    return <Badge variant="secondary">Cerrada</Badge>;
  }
  if (round.is_active && round.is_voting_open) {
    return <Badge variant="default">Ronda en curso</Badge>;
  }
  if (round.is_active && !round.is_voting_open) {
    return <Badge variant="outline">Sala abierta</Badge>;
  }
  return <Badge variant="outline">Creada</Badge>;
}

export function AdminVotingList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rounds, setRounds] = useState<RoundListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRound, setCreatingRound] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoundForm, setNewRoundForm] = useState<NewRoundForm>({
    title: "",
    description: "",
    year: new Date().getFullYear(),
    team: "ECE",
    max_votantes: 100,
    census_mode: "maximum",
  });

  const loadRounds = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("rounds")
        .select("id,title,description,year,team,max_votantes,is_active,is_closed,is_voting_open,join_locked,current_round_number,votes_current_round,created_at")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setRounds((data || []) as RoundListItem[]);
    } catch {
      toast({
        title: "Error",
        description: "No se pudo cargar la lista de votaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let mounted = true;

    loadRounds();

    const channel = supabase
      .channel("admin-voting-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds" },
        () => {
          if (mounted) {
            loadRounds();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [loadRounds]);

  const resetCreateForm = () => {
    setNewRoundForm({
      title: "",
      description: "",
      year: new Date().getFullYear(),
      team: "ECE",
      max_votantes: 100,
      census_mode: "maximum",
    });
  };

  const createRound = async () => {
    const title = newRoundForm.title.trim();
    const generatedAccessCode = generateAccessCode();

    if (!title) {
      toast({
        title: "Titulo obligatorio",
        description: "Debes indicar el nombre de la votacion.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingRound(true);
      const { error } = await supabase
        .from("rounds")
        .insert([
          {
            title,
            description: newRoundForm.description.trim() || null,
            year: newRoundForm.year,
            team: newRoundForm.team,
            max_votantes: newRoundForm.max_votantes,
            access_code: generatedAccessCode,
            census_mode: newRoundForm.census_mode,
            is_active: false,
          },
        ]);

      if (error) {
        throw error;
      }

      toast({
        title: "Votacion creada",
        description: `La nueva votacion se ha creado con codigo ${generatedAccessCode}.`,
      });
      setCreateDialogOpen(false);
      resetCreateForm();
      await loadRounds();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo crear la votacion.",
        variant: "destructive",
      });
    } finally {
      setCreatingRound(false);
    }
  };

  const totalActive = useMemo(
    () => rounds.filter((round) => round.is_active && !round.is_closed).length,
    [rounds]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Vote className="w-4 h-4" />
                {rounds.length} votaciones
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="w-4 h-4" />
                {totalActive} activas
              </span>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear votacion
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Nueva votacion</DialogTitle>
                  <DialogDescription>
                    Crea una votacion desde esta pestaña sin salir de la lista.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="new-round-title">Titulo</Label>
                    <Input
                      id="new-round-title"
                      value={newRoundForm.title}
                      onChange={(event) =>
                        setNewRoundForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Elecciones ECE 2026"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="new-round-description">Descripcion</Label>
                    <Textarea
                      id="new-round-description"
                      rows={3}
                      value={newRoundForm.description}
                      onChange={(event) =>
                        setNewRoundForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Contexto de la votacion"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="new-round-year">Ano</Label>
                      <Input
                        id="new-round-year"
                        type="number"
                        value={newRoundForm.year}
                        onChange={(event) =>
                          setNewRoundForm((prev) => ({
                            ...prev,
                            year: Number.parseInt(event.target.value, 10) || new Date().getFullYear(),
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="new-round-max-votantes">Cupo maximo</Label>
                      <Input
                        id="new-round-max-votantes"
                        type="number"
                        min={1}
                        value={newRoundForm.max_votantes}
                        onChange={(event) =>
                          setNewRoundForm((prev) => ({
                            ...prev,
                            max_votantes: Number.parseInt(event.target.value, 10) || 1,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Equipo</Label>
                      <Select
                        value={newRoundForm.team}
                        onValueChange={(value: "ECE" | "ECL") =>
                          setNewRoundForm((prev) => ({ ...prev, team: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ECE">ECE</SelectItem>
                          <SelectItem value="ECL">ECL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Modo de censo</Label>
                      <Select
                        value={newRoundForm.census_mode}
                        onValueChange={(value: "maximum" | "exact") =>
                          setNewRoundForm((prev) => ({ ...prev, census_mode: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maximum">Maximo</SelectItem>
                          <SelectItem value="exact">Exacto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                    El codigo de sala se genera automaticamente con 4 caracteres alfanumericos.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creatingRound}>
                    Cancelar
                  </Button>
                  <Button onClick={createRound} disabled={creatingRound}>
                    {creatingRound ? "Creando..." : "Crear votacion"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {rounds.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay votaciones creadas todavia.
          </CardContent>
        </Card>
      ) : (
        rounds.map((round) => (
          <Card key={round.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{round.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{round.team}</span>
                    <span>•</span>
                    <span>{round.year}</span>
                    {getStatusBadge(round)}
                  </div>
                </div>
                <Button onClick={() => navigate(`/admin/votaciones/${round.id}`)}>
                  Gestionar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Ronda actual</p>
                  <p className="font-medium">{round.current_round_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Conectados/votos ronda</p>
                  <p className="font-medium">{round.votes_current_round} / {round.max_votantes}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entrada</p>
                  <p className="font-medium">{round.join_locked ? "Bloqueada" : "Abierta"}</p>
                </div>
              </div>
              {round.description && (
                <p className="text-sm text-muted-foreground mt-3">{round.description}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
