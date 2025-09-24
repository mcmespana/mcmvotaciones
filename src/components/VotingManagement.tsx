import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Play, 
  Pause, 
  Calendar,
  Eye,
  EyeOff,
  Save,
  X,
  ChevronRight,
  Award
} from 'lucide-react';

interface Round {
  id: string;
  title: string;
  description: string;
  year: number;
  team: 'ECE' | 'ECL';
  expected_voters: number;
  is_active: boolean;
  is_closed: boolean;
  current_round_number: number;
  max_votes_per_round: number;
  max_selected_candidates: number;
  selected_candidates_count: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

interface Candidate {
  id: string;
  round_id: string;
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
  elimination_round: number | null;
  created_at: string;
  updated_at: string;
}

interface RoundResult {
  id: string;
  round_id: string;
  round_number: number;
  candidate_id: string;
  vote_count: number;
  is_visible: boolean;
  created_at: string;
  candidate?: Candidate;
}

interface RoundWithCandidates extends Round {
  candidates: Candidate[];
  vote_count?: number;
}

interface NewRoundForm {
  title: string;
  description: string;
  year: number;
  team: 'ECE' | 'ECL';
  expected_voters: number;
}

interface NewCandidateForm {
  name: string;
  surname: string;
  location: string;
  group_name: string;
  age: number | '';
  description: string;
  image_url: string;
}

export function VotingManagement() {
  const { toast } = useToast();
  const [rounds, setRounds] = useState<RoundWithCandidates[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rounds');
  const [selectedRound, setSelectedRound] = useState<RoundWithCandidates | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [isNewRoundDialogOpen, setIsNewRoundDialogOpen] = useState(false);
  const [isNewCandidateDialogOpen, setIsNewCandidateDialogOpen] = useState(false);
  const [isEditingRound, setIsEditingRound] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Functions for multi-round voting
  const calculateCurrentMaxVotes = (round: Round) => {
    const activeCount = round.max_selected_candidates - round.selected_candidates_count;
    if (activeCount <= 1) return 1;
    if (activeCount <= 2) return 2;
    return 3;
  };

  const loadRoundResults = async (roundId: string, roundNumber: number) => {
    try {
      const { data, error } = await supabase
        .from('round_results')
        .select(`
          *,
          candidate:candidates (
            id,
            name,
            surname,
            location,
            group_name,
            age,
            image_url,
            is_eliminated,
            is_selected
          )
        `)
        .eq('round_id', roundId)
        .eq('round_number', roundNumber)
        .order('vote_count', { ascending: false });

      if (error) throw error;
      
      setRoundResults(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los resultados',
        variant: 'destructive',
      });
    }
  };

  const nextRound = async (round: RoundWithCandidates) => {
    try {
      // Calculate current round results
      await supabase.rpc('calculate_round_results', {
        round_id: round.id,
        round_number: round.current_round_number
      });

      // Load and show results
      await loadRoundResults(round.id, round.current_round_number);
      setShowResults(true);
      
      toast({
        title: 'Resultados calculados',
        description: `Resultados de la ronda ${round.current_round_number} listos para mostrar`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron calcular los resultados',
        variant: 'destructive',
      });
    }
  };

  const showResultsToUsers = async (round: RoundWithCandidates) => {
    try {
      // Make results visible to users
      await supabase
        .from('round_results')
        .update({ is_visible: true })
        .eq('round_id', round.id)
        .eq('round_number', round.current_round_number);

      toast({
        title: 'Resultados publicados',
        description: 'Los usuarios pueden ver los resultados de esta ronda',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron publicar los resultados',
        variant: 'destructive',
      });
    }
  };

  const hideResultsFromUsers = async (round: RoundWithCandidates) => {
    try {
      await supabase
        .from('round_results')
        .update({ is_visible: false })
        .eq('round_id', round.id)
        .eq('round_number', round.current_round_number);

      toast({
        title: 'Resultados ocultados',
        description: 'Los resultados han sido ocultados de los usuarios',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron ocultar los resultados',
        variant: 'destructive',
      });
    }
  };

  const startNextRound = async (round: RoundWithCandidates) => {
    try {
      // Hide current results
      await hideResultsFromUsers(round);
      
      // Get candidates with lowest votes to eliminate
      const sortedResults = roundResults.sort((a, b) => a.vote_count - b.vote_count);
      
      // Find candidates with 0 votes or those with majority elimination
      const candidatesToEliminate = sortedResults.filter(result => 
        result.vote_count === 0 || 
        (roundResults.length > round.max_selected_candidates && result.vote_count < Math.max(...roundResults.map(r => r.vote_count)) / 2)
      );
      
      // Eliminate candidates
      if (candidatesToEliminate.length > 0) {
        await supabase
          .from('candidates')
          .update({ 
            is_eliminated: true, 
            elimination_round: round.current_round_number 
          })
          .in('id', candidatesToEliminate.map(c => c.candidate_id));
      }

      // Update round to next round number
      const updates: Partial<Round> = {
        current_round_number: round.current_round_number + 1,
        max_votes_per_round: calculateCurrentMaxVotes(round),
        updated_at: new Date().toISOString()
      };

      await updateRound(round.id, updates);
      setShowResults(false);
      setRoundResults([]);
      
      toast({
        title: 'Nueva ronda iniciada',
        description: `Ronda ${round.current_round_number + 1} lista para votar`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la siguiente ronda',
        variant: 'destructive',
      });
    }
  };
  
  const [newRoundForm, setNewRoundForm] = useState<NewRoundForm>({
    title: '',
    description: '',
    year: new Date().getFullYear(),
    team: 'ECE',
    expected_voters: 100
  });

  const [newCandidateForm, setNewCandidateForm] = useState<NewCandidateForm>({
    name: '',
    surname: '',
    location: '',
    group_name: '',
    age: '',
    description: '',
    image_url: ''
  });

  useEffect(() => {
    loadRounds();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRounds = async () => {
    try {
      setLoading(true);
      
      const { data: roundsData, error: roundsError } = await supabase
        .from('rounds')
        .select(`
          *,
          candidates(*)
        `)
        .order('created_at', { ascending: false });

      if (roundsError) {
        throw roundsError;
      }

      // Get vote counts for each round
      const roundsWithVoteCounts = await Promise.all(
        (roundsData || []).map(async (round) => {
          const { count } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('round_id', round.id);
          
          return {
            ...round,
            vote_count: count || 0
          };
        })
      );

      setRounds(roundsWithVoteCounts);
    } catch (error: unknown) {
      // Provide more specific error messages
      let errorMessage = 'No se pudieron cargar las votaciones';
      if (error && typeof error === 'object' && 'code' in error && error.code === '42501') {
        errorMessage = 'Error de permisos: Para desarrollo, ejecuta reset-database.sql en Supabase. Para producción, revisa las políticas RLS y permisos de usuario.';
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createRound = async () => {
    try {
      if (!newRoundForm.title.trim()) {
        toast({
          title: 'Error',
          description: 'El título es obligatorio',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('rounds')
        .insert([{
          title: newRoundForm.title.trim(),
          description: newRoundForm.description.trim(),
          year: newRoundForm.year,
          team: newRoundForm.team,
          expected_voters: newRoundForm.expected_voters,
        }]);

      if (error) {
        throw error;
      }

      toast({
        title: 'Éxito',
        description: 'Votación creada correctamente',
      });

      setIsNewRoundDialogOpen(false);
      setNewRoundForm({
        title: '',
        description: '',
        year: new Date().getFullYear(),
        team: 'ECE',
        expected_voters: 100
      });
      
      await loadRounds();
    } catch (error: unknown) {
      // Provide more specific error messages
      let errorMessage = 'No se pudo crear la votación';
      if (error && typeof error === 'object' && 'code' in error && error.code === '42501') {
        errorMessage = 'Error de permisos: Para desarrollo, ejecuta reset-database.sql en Supabase. Para producción, revisa las políticas RLS y permisos de usuario.';
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const updateRound = async (roundId: string, updates: Partial<Round>) => {
    try {
      const { error } = await supabase
        .from('rounds')
        .update(updates)
        .eq('id', roundId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Éxito',
        description: 'Votación actualizada correctamente',
      });
      
      await loadRounds();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la votación',
        variant: 'destructive',
      });
    }
  };

  const deleteRound = async (roundId: string) => {
    try {
      const { error } = await supabase
        .from('rounds')
        .delete()
        .eq('id', roundId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Éxito',
        description: 'Votación eliminada correctamente',
      });
      
      await loadRounds();
      setSelectedRound(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la votación',
        variant: 'destructive',
      });
    }
  };

  const toggleRoundStatus = async (round: RoundWithCandidates) => {
    const updates: Partial<Round> = {
      is_active: !round.is_active,
      updated_at: new Date().toISOString()
    };

    // If activating, ensure only one round is active
    if (!round.is_active) {
      // First deactivate all other rounds
      await supabase
        .from('rounds')
        .update({ is_active: false })
        .neq('id', round.id);
    }

    await updateRound(round.id, updates);
  };

  const closeRound = async (round: RoundWithCandidates) => {
    const updates: Partial<Round> = {
      is_closed: true,
      is_active: false,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await updateRound(round.id, updates);
  };

  const addCandidate = async () => {
    if (!selectedRound) return;

    try {
      if (!newCandidateForm.name.trim() || !newCandidateForm.surname.trim()) {
        toast({
          title: 'Error',
          description: 'El nombre y apellido son obligatorios',
          variant: 'destructive',
        });
        return;
      }

      // Get the next order index
      const maxOrderIndex = Math.max(0, ...selectedRound.candidates.map(c => c.order_index));

      const { error } = await supabase
        .from('candidates')
        .insert([{
          round_id: selectedRound.id,
          name: newCandidateForm.name.trim(),
          surname: newCandidateForm.surname.trim(),
          location: newCandidateForm.location.trim() || null,
          group_name: newCandidateForm.group_name.trim() || null,
          age: typeof newCandidateForm.age === 'number' ? newCandidateForm.age : null,
          description: newCandidateForm.description.trim() || null,
          image_url: newCandidateForm.image_url.trim() || null,
          order_index: maxOrderIndex + 1,
        }]);

      if (error) {
        throw error;
      }

      toast({
        title: 'Éxito',
        description: 'Candidato agregado correctamente',
      });

      setIsNewCandidateDialogOpen(false);
      setNewCandidateForm({
        name: '',
        surname: '',
        location: '',
        group_name: '',
        age: '',
        description: '',
        image_url: ''
      });
      
      await loadRounds();
      
      // Update selected round
      const updatedRound = rounds.find(r => r.id === selectedRound.id);
      if (updatedRound) {
        setSelectedRound(updatedRound);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el candidato',
        variant: 'destructive',
      });
    }
  };

  const deleteCandidate = async (candidateId: string) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Éxito',
        description: 'Candidato eliminado correctamente',
      });
      
      await loadRounds();
      
      // Update selected round
      if (selectedRound) {
        const updatedRound = rounds.find(r => r.id === selectedRound.id);
        if (updatedRound) {
          setSelectedRound(updatedRound);
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el candidato',
        variant: 'destructive',
      });
    }
  };

  const getRoundStatusBadge = (round: RoundWithCandidates) => {
    if (round.is_closed) {
      return <Badge variant="secondary">Cerrada</Badge>;
    }
    if (round.is_active) {
      return <Badge variant="default">Activa</Badge>;
    }
    return <Badge variant="outline">Inactiva</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestión de Votaciones</h2>
        <Dialog open={isNewRoundDialogOpen} onOpenChange={setIsNewRoundDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Votación
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nueva Votación</DialogTitle>
              <DialogDescription>
                Completa los datos para crear una nueva votación. Podrás agregar candidatos después de crearla.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={newRoundForm.title}
                  onChange={(e) => setNewRoundForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Votación MCM 2024"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newRoundForm.description}
                  onChange={(e) => setNewRoundForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción de la votación..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    type="number"
                    value={newRoundForm.year}
                    onChange={(e) => setNewRoundForm(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expected_voters">Votantes esperados</Label>
                  <Input
                    id="expected_voters"
                    type="number"
                    value={newRoundForm.expected_voters}
                    onChange={(e) => setNewRoundForm(prev => ({ ...prev, expected_voters: parseInt(e.target.value) || 100 }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="team">Equipo/Categoría *</Label>
                <Select
                  value={newRoundForm.team}
                  onValueChange={(value: 'ECE' | 'ECL') => setNewRoundForm(prev => ({ ...prev, team: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ECE">ECE (Equipo Coordinador Europa)</SelectItem>
                    <SelectItem value="ECL">ECL (Equipo Coordinador Local)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsNewRoundDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createRound}>
                <Save className="w-4 h-4 mr-2" />
                Crear Votación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="rounds">Votaciones</TabsTrigger>
          <TabsTrigger value="candidates" disabled={!selectedRound}>
            Candidatos {selectedRound && `(${selectedRound.candidates.length})`}
          </TabsTrigger>
          <TabsTrigger value="monitoring">Monitoreo</TabsTrigger>
        </TabsList>

        <TabsContent value="rounds" className="space-y-4">
          <div className="grid gap-4">
            {rounds.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No hay votaciones</h3>
                  <p className="text-muted-foreground mb-4">Crear tu primera votación para comenzar</p>
                  <Button onClick={() => setIsNewRoundDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primera Votación
                  </Button>
                </CardContent>
              </Card>
            ) : (
              rounds.map((round) => (
                <Card key={round.id} className={`transition-colors cursor-pointer ${selectedRound?.id === round.id ? 'border-primary' : 'hover:border-primary/50'}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{round.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{round.team}</span>
                          <span>•</span>
                          <span>{round.year}</span>
                          {getRoundStatusBadge(round)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRound(selectedRound?.id === round.id ? null : round)}
                        >
                          {selectedRound?.id === round.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        {!round.is_closed && (
                          <Button
                            variant={round.is_active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => toggleRoundStatus(round)}
                          >
                            {round.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar votación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente la votación "{round.title}" y todos sus datos asociados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRound(round.id)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Candidatos:</span>
                        <p className="font-medium">{round.candidates.length}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Votos:</span>
                        <p className="font-medium">{round.vote_count || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Esperados:</span>
                        <p className="font-medium">{round.expected_voters}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Participación:</span>
                        <p className="font-medium">
                          {round.expected_voters > 0 
                            ? `${Math.round(((round.vote_count || 0) / round.expected_voters) * 100)}%`
                            : '0%'
                          }
                        </p>
                      </div>
                    </div>
                    {round.description && (
                      <p className="text-muted-foreground mt-3">{round.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          {selectedRound ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Candidatos para: {selectedRound.title}
                </h3>
                <Dialog open={isNewCandidateDialogOpen} onOpenChange={setIsNewCandidateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Candidato
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Agregar Candidato</DialogTitle>
                      <DialogDescription>
                        Completa la información del candidato. Los campos marcados con * son obligatorios.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="candidate_name">Nombre *</Label>
                          <Input
                            id="candidate_name"
                            value={newCandidateForm.name}
                            onChange={(e) => setNewCandidateForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nombre"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="candidate_surname">Apellidos *</Label>
                          <Input
                            id="candidate_surname"
                            value={newCandidateForm.surname}
                            onChange={(e) => setNewCandidateForm(prev => ({ ...prev, surname: e.target.value }))}
                            placeholder="Apellidos"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="candidate_location">Lugar de pertenencia</Label>
                          <Input
                            id="candidate_location"
                            value={newCandidateForm.location}
                            onChange={(e) => setNewCandidateForm(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="Ciudad, región..."
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="candidate_group">Grupo</Label>
                          <Input
                            id="candidate_group"
                            value={newCandidateForm.group_name}
                            onChange={(e) => setNewCandidateForm(prev => ({ ...prev, group_name: e.target.value }))}
                            placeholder="Grupo de pertenencia"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="candidate_age">Edad</Label>
                        <Input
                          id="candidate_age"
                          type="number"
                          value={newCandidateForm.age}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, age: e.target.value ? parseInt(e.target.value) : '' }))}
                          placeholder="Edad"
                          min="18"
                          max="100"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="candidate_description">Descripción</Label>
                        <Textarea
                          id="candidate_description"
                          value={newCandidateForm.description}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descripción del candidato..."
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="candidate_image">URL de imagen</Label>
                        <Input
                          id="candidate_image"
                          value={newCandidateForm.image_url}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, image_url: e.target.value }))}
                          placeholder="https://ejemplo.com/imagen.jpg"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsNewCandidateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={addCandidate}>
                        <Save className="w-4 h-4 mr-2" />
                        Agregar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedRound.candidates.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mb-4" />
                      <h4 className="text-lg font-medium mb-2">No hay candidatos</h4>
                      <p className="text-muted-foreground mb-4">Agregar candidatos para esta votación</p>
                      <Button onClick={() => setIsNewCandidateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Primer Candidato
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  selectedRound.candidates
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((candidate) => (
                      <Card key={candidate.id}>
                        <CardHeader className="pb-3">
                          {candidate.image_url && (
                            <div className="aspect-square overflow-hidden rounded-lg mb-3">
                              <img 
                                src={candidate.image_url} 
                                alt={candidate.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{candidate.name} {candidate.surname}</CardTitle>
                              <div className="mt-2 space-y-1">
                                {candidate.age && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {candidate.age} años
                                    </Badge>
                                  </div>
                                )}
                                {candidate.location && (
                                  <p className="text-sm text-muted-foreground">📍 {candidate.location}</p>
                                )}
                                {candidate.group_name && (
                                  <p className="text-sm text-muted-foreground">👥 {candidate.group_name}</p>
                                )}
                                {candidate.is_selected && (
                                  <Badge variant="default" className="text-xs">
                                    <Award className="w-3 h-3 mr-1" />
                                    Seleccionado
                                  </Badge>
                                )}
                                {candidate.is_eliminated && (
                                  <Badge variant="destructive" className="text-xs">
                                    Eliminado
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar candidato?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará al candidato "{candidate.name} {candidate.surname}" de la votación.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteCandidate(candidate.id)}>
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardHeader>
                        {candidate.description && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              {candidate.description}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    ))
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h4 className="text-lg font-medium mb-2">Selecciona una votación</h4>
                <p className="text-muted-foreground">Elige una votación de la lista para gestionar sus candidatos</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoreo en Tiempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rounds.filter(r => r.is_active).map((round) => (
                  <div key={round.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{round.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Ronda {round.current_round_number} • {round.team} • Máximo {round.max_votes_per_round} votos por usuario
                        </p>
                      </div>
                      <Badge variant="default">Activa</Badge>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Votos actuales:</span>
                        <p className="text-2xl font-bold">{round.vote_count || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Meta esperada:</span>
                        <p className="text-2xl font-bold">{round.expected_voters}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Participación:</span>
                        <p className="text-2xl font-bold">
                          {round.expected_voters > 0 
                            ? `${Math.round(((round.vote_count || 0) / round.expected_voters) * 100)}%`
                            : '0%'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Seleccionados:</span>
                        <p className="text-2xl font-bold">{round.selected_candidates_count}/{round.max_selected_candidates}</p>
                      </div>
                    </div>

                    {/* Round Results Display */}
                    {showResults && roundResults.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h5 className="font-medium mb-3">Resultados Ronda {round.current_round_number}</h5>
                        <div className="space-y-2">
                          {roundResults
                            .filter(result => result.vote_count > 0)
                            .sort((a, b) => b.vote_count - a.vote_count)
                            .map((result) => (
                            <div key={result.candidate_id} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div>
                                <span className="font-medium">
                                  {result.candidate?.name} {result.candidate?.surname}
                                </span>
                                {result.candidate?.location && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    • {result.candidate.location}
                                  </span>
                                )}
                              </div>
                              <Badge variant="secondary">{result.vote_count} votos</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Round Management Controls */}
                    {!round.is_closed && (
                      <div className="flex flex-wrap gap-2">
                        {!showResults ? (
                          <>
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => nextRound(round)}
                            >
                              <ChevronRight className="w-4 h-4 mr-2" />
                              Finalizar Ronda {round.current_round_number}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => toggleRoundStatus(round)}>
                              <Pause className="w-4 h-4 mr-2" />
                              Pausar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => showResultsToUsers(round)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Mostrar Resultados
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => hideResultsFromUsers(round)}
                            >
                              <EyeOff className="w-4 h-4 mr-2" />
                              Ocultar Resultados
                            </Button>
                            {round.selected_candidates_count < round.max_selected_candidates && (
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => startNextRound(round)}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Iniciar Ronda {round.current_round_number + 1}
                              </Button>
                            )}
                          </>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <X className="w-4 h-4 mr-2" />
                              Cerrar Votación
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Cerrar votación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción cerrará permanentemente la votación "{round.title}". No se podrán agregar más votos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => closeRound(round)}>
                                Cerrar Votación
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
                {rounds.filter(r => r.is_active).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay votaciones activas para monitorear</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}