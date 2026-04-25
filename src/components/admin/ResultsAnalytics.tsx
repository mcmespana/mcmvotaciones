import { useState, useEffect, useCallback } from "react";
import { formatSurname } from "@/lib/candidateFormat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import { BarChart3, ChevronLeft, ChevronRight, TrendingUp, Users, Vote } from "lucide-react";

interface ResultsAnalyticsProps {
  lockedRoundId?: string;
}

interface Round {
  id: string;
  title: string;
  team: string;
  current_round_number: number;
  max_votantes: number;
  votes_current_round: number;
  selected_candidates_count: number;
  max_selected_candidates: number;
  is_closed: boolean;
}

interface RoundResult {
  candidate_id: string;
  round_number: number;
  vote_count: number;
  percentage: number;
  candidate?: {
    name: string;
    surname: string;
    location: string | null;
    is_selected: boolean;
  } | Array<{
    name: string;
    surname: string;
    location: string | null;
    is_selected: boolean;
  }>;
}

const normalizeCandidate = (candidate: RoundResult["candidate"]) =>
  Array.isArray(candidate) ? candidate[0] : candidate;

const CHART_COLORS = [
  "#2563EB", "#DC2626", "#D97706", "#16A34A",
  "#0EA5E9", "#F97316", "#EC4899", "#06B6D4",
  "#84CC16", "#F43F5E", "#14B8A6", "#64748B",
];

export function ResultsAnalytics({ lockedRoundId }: ResultsAnalyticsProps) {
  const { toast } = useToast();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [selectedRoundNum, setSelectedRoundNum] = useState<number>(1);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRounds = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("rounds")
        .select("id, title, team, current_round_number, max_votantes, votes_current_round, selected_candidates_count, max_selected_candidates, is_closed")
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
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar las votaciones", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [lockedRoundId, toast, selectedRoundId]);

  const loadResults = useCallback(async () => {
    if (!selectedRoundId) return;
    try {
      const { data, error } = await supabase
        .from("round_results")
        .select(`
          candidate_id, round_number, vote_count, percentage,
          candidate:candidates (name, surname, location, is_selected)
        `)
        .eq("round_id", selectedRoundId)
        .eq("round_number", selectedRoundNum)
        .order("vote_count", { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los resultados", variant: "destructive" });
    }
  }, [selectedRoundId, selectedRoundNum, toast]);

  useEffect(() => { loadRounds(); }, [loadRounds]);
  useEffect(() => { loadResults(); }, [loadResults]);

  const selectedRound = rounds.find((r) => r.id === selectedRoundId);
  const maxRoundNumber = selectedRound?.current_round_number || 1;
  const canGoPrevRound = selectedRoundNum > 1;
  const canGoNextRound = selectedRoundNum < maxRoundNumber;

  const goPrevRound = () => {
    if (!canGoPrevRound) return;
    setSelectedRoundNum((prev) => Math.max(1, prev - 1));
  };

  const goNextRound = () => {
    if (!canGoNextRound) return;
    setSelectedRoundNum((prev) => Math.min(maxRoundNumber, prev + 1));
  };

  // Chart data
  const barData = results.map((r) => ({
    name: normalizeCandidate(r.candidate)
      ? `${normalizeCandidate(r.candidate)!.name} ${formatSurname(normalizeCandidate(r.candidate)!.surname)}`
      : "?",
    votos: r.vote_count,
    porcentaje: r.percentage,
    selected: normalizeCandidate(r.candidate)?.is_selected || false,
  }));

  const pieData = results
    .filter((r) => r.vote_count > 0)
    .map((r) => ({
      name: normalizeCandidate(r.candidate)
        ? `${normalizeCandidate(r.candidate)!.name} ${formatSurname(normalizeCandidate(r.candidate)!.surname)}`
        : "?",
      value: r.vote_count,
    }));

  // Summary stats
  const totalVotes = results.reduce((sum, r) => sum + r.vote_count, 0);
  const topCandidate = results[0];
  const topCandidateInfo = normalizeCandidate(topCandidate?.candidate);
  const participation = selectedRound
    ? Math.round(
        ((selectedRound.votes_current_round || 0) /
          Math.max(selectedRound.max_votantes, 1)) *
          100
      )
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Análisis de Resultados
        </h2>
        <div className="flex items-center gap-3">
          {!lockedRoundId && (
            <Select value={selectedRoundId} onValueChange={(v) => { setSelectedRoundId(v); setSelectedRoundNum(1); }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Seleccionar votación" />
              </SelectTrigger>
              <SelectContent>
                {rounds.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title} ({r.team})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedRound && selectedRound.current_round_number > 1 && (
            <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
              {/*
                Usamos flechas en lugar de input numérico para evitar la barra/spinner
                nativa del navegador y mantener una navegación de ronda más clara.
              */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={goPrevRound}
                disabled={!canGoPrevRound}
                aria-label="Ronda anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-24 text-center text-sm font-medium">
                Ronda {selectedRoundNum}
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={goNextRound}
                disabled={!canGoNextRound}
                aria-label="Ronda siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votos</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVotes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participación</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participation}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Líder</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {topCandidateInfo
                ? `${topCandidateInfo.name} ${formatSurname(topCandidateInfo.surname)}`
                : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seleccionados</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedRound
                ? `${selectedRound.selected_candidates_count}/${selectedRound.max_selected_candidates}`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Votos por Candidato</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: number, name: string) => [
                      name === "votos" ? `${value} votos` : `${value.toFixed(1)}%`,
                      name === "votos" ? "Votos" : "Porcentaje",
                    ]}
                  />
                  <Bar dataKey="votos" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.selected ? "#10B981" : CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No hay resultados para esta ronda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución de Votos</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={130}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`pie-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tabla de Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Candidato</th>
                  <th className="text-left py-2 px-3">Lugar</th>
                  <th className="text-right py-2 px-3">Votos</th>
                  <th className="text-right py-2 px-3">%</th>
                  <th className="text-center py-2 px-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.candidate_id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium">{i + 1}</td>
                    <td className="py-2 px-3 font-medium">
                      {normalizeCandidate(r.candidate)
                        ? `${normalizeCandidate(r.candidate)!.name} ${formatSurname(normalizeCandidate(r.candidate)!.surname)}`
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {normalizeCandidate(r.candidate)?.location || "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      {r.vote_count}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {r.percentage.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-center">
                      {normalizeCandidate(r.candidate)?.is_selected ? (
                        <Badge variant="default" className="text-xs">
                          Seleccionado
                        </Badge>
                      ) : r.percentage > 50 ? (
                        <Badge variant="secondary" className="text-xs">
                          +50%
                        </Badge>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
