import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { generateAccessCode } from "@/lib/accessCode";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Plus, Vote, Users, Trash2, Search, Filter } from "lucide-react";

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
    return (
      <span className="inline-flex items-center rounded-full border border-destructive bg-destructive shadow-md px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">
        Cerrada
      </span>
    );
  }
  if (round.is_active && round.is_voting_open) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500 bg-emerald-500 shadow-md px-2.5 py-0.5 text-xs font-bold text-white">
        Ronda en curso
      </span>
    );
  }
  if (round.is_active && !round.is_voting_open) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-500 bg-amber-500 shadow-md px-2.5 py-0.5 text-xs font-bold text-white">
        Sala abierta
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-muted-foreground/30 bg-muted/40 px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
      En espera
    </span>
  );
}



function getTeamColor(team: string) {
  switch (team) {
    case "ECE": return "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400";
    case "ECL": return "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30 dark:text-fuchsia-400";
    default: return "bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-400";
  }
}

function getRoundTone(round: RoundListItem) {
  if (round.is_closed) return {
    card: "border-destructive/30 bg-destructive/5",
    topBar: "from-destructive/40 to-destructive",
    metric: "bg-destructive/10 border-destructive/20"
  };
  if (round.is_active && round.is_voting_open) return {
    card: "border-emerald-500/30 bg-emerald-500/5",
    topBar: "from-emerald-500/40 to-emerald-500",
    metric: "bg-emerald-500/10 border-emerald-500/20"
  };
  if (round.is_active && !round.is_voting_open) return {
    card: "border-amber-500/30 bg-amber-500/5",
    topBar: "from-amber-500/40 to-amber-500",
    metric: "bg-amber-500/10 border-amber-500/20"
  };
  return {
    card: "border-outline-variant/30 bg-surface-container/20",
    topBar: "from-primary/20 to-primary/40",
    metric: "bg-surface-container/50 border-outline-variant/20"
  };
}


export function AdminVotingList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [rounds, setRounds] = useState<RoundListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
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

  const handleDeleteRound = async (id: string, title: string) => {
    try {
      const { error } = await supabase.from('rounds').delete().eq('id', id);
      if (error) throw error;
      setRounds(rounds.filter(r => r.id !== id));
      toast({
        title: "Votación eliminada",
        description: `La votación "${title}" ha sido eliminada.`,
      });
    } catch (err) {
      console.error("Error deleting round:", err);
      toast({
        title: "Error al eliminar",
        description: err instanceof Error ? err.message : "No se pudo eliminar la votación.",
        variant: "destructive",
      });
    }
  };

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


  const filteredRounds = rounds.filter((round) => {
    const matchesSearch = round.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (round.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesTeam = teamFilter === "ALL" || round.team === teamFilter;
    return matchesSearch && matchesTeam;
  });

  return (
    <div className="space-y-6">
      <Card className="admin-shell">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex w-full flex-col sm:w-auto sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar votación..." 
                  className="pl-8 bg-surface-container-lowest/50" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-surface-container-lowest/50">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span>{teamFilter === "ALL" ? "Todos los grupos" : teamFilter}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los grupos</SelectItem>
                  <SelectItem value="ECE">ECE</SelectItem>
                  <SelectItem value="ECL">ECL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear votacion
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px] admin-shell">
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

                  <p className="admin-soft rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
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

      {filteredRounds.length === 0 ? (
        <Card className="admin-shell">
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay votaciones creadas todavia.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredRounds.map((round) => {
            const tone = getRoundTone(round);
            return (
              <Card key={round.id} className={`admin-shell relative overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border ${tone.card}`}>
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${tone.topBar}`} />
                <CardHeader className="p-4 pb-1 flex-none">
                  <div className="flex flex-col gap-2">
                    <CardTitle className="font-headline text-2xl mb-1 font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                      {round.title}
                    </CardTitle>
                    {isSuperAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar votación?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará la votación "{round.title}" y todos los datos asociados (candidatos, votos).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteRound(round.id, round.title)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
                      <span className={`border px-2.5 py-0.5 rounded-md shadow-sm font-bold ${getTeamColor(round.team)}`}>{round.team}</span>
                      <span className="border border-primary/30 bg-primary/5 text-primary px-2.5 py-0.5 rounded-md shadow-sm font-bold">{round.year}</span>
                      {getStatusBadge(round)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-end">
                  {round.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 border-l-2 border-primary/20 pl-3">
                      {round.description}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-xs mt-auto">
                    <div className={`admin-soft p-2 rounded-xl border shadow-inner flex flex-col items-center justify-center text-center ${tone.metric}`}>
                      <span className="text-muted-foreground mb-1 leading-none text-[10px] uppercase tracking-wider font-semibold">Ronda</span>
                      <span className="font-bold text-base leading-none">{round.current_round_number}</span>
                    </div>
                    <div className={`admin-soft p-2 rounded-xl border shadow-inner flex flex-col items-center justify-center text-center ${tone.metric}`}>
                      <span className="text-muted-foreground mb-1 leading-none text-[10px] uppercase tracking-wider font-semibold">Conectados</span>
                      <span className="font-bold text-base leading-none">{round.votes_current_round}</span>
                    </div>
                    <div className={`admin-soft p-2 rounded-xl border shadow-inner flex flex-col items-center justify-center text-center ${tone.metric}`}>
                      <span className="text-muted-foreground mb-1.5 leading-none text-[10px] uppercase tracking-wider font-semibold">Entrada</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold leading-none ${
                        !round.is_active && !round.is_closed 
                          ? "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                          : round.join_locked || round.is_closed 
                            ? "bg-destructive/15 text-destructive border border-destructive/30" 
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      }`}>
                        {!round.is_active && !round.is_closed ? "En espera" : (round.join_locked || round.is_closed) ? "Cerrada" : "Abierta"}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    onClick={() => navigate(`/admin/votaciones/${round.id}`)}
                    className="w-full bg-surface-container/50 hover:bg-primary hover:text-primary-foreground border shadow-sm font-semibold rounded-xl transition-all duration-300 h-10"
                    variant="secondary"
                  >
                    Gestionar Votación
                    <ArrowRight className="w-4 h-4 ml-2 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
