import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import { getMaxVotesAllowed } from '@/lib/votingRules';
import { debugLog } from '@/lib/logger';
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
  Award,
  Upload,
  FileDown,
  Database
} from 'lucide-react';

interface Round {
  id: string;
  title: string;
  description: string;
  year: number;
  team: 'ECE' | 'ECL';
  max_votantes: number; // Renamed from expected_voters - defines fixed voter quota
  votes_current_round: number;
  is_active: boolean;
  is_closed: boolean;
  round_finalized: boolean;
  show_results_to_voters: boolean;
  current_round_number: number;
  max_votes_per_round: number;
  max_selected_candidates: number;
  selected_candidates_count: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

// New interfaces for seat management
interface Seat {
  id: string;
  round_id: string;
  fingerprint_hash: string;
  browser_instance_id: string;
  user_agent: string | null;
  ip_address: string | null;
  joined_at: string;
  last_seen_at: string;
  estado: 'libre' | 'ocupado' | 'expirado';
  created_at: string;
  updated_at: string;
}

interface JoinSeatResponse {
  success: boolean;
  seat_id?: string;
  is_new?: boolean;
  message: string;
  error_code?: 'ROUND_NOT_FOUND' | 'ROUND_FULL';
  occupied_seats?: number;
  max_votantes?: number;
}

interface VerifySeatResponse {
  valid: boolean;
  seat_id?: string;
  round_id?: string;
  message: string;
  error_code?: 'SEAT_NOT_FOUND' | 'SEAT_MISMATCH' | 'SEAT_EXPIRED' | 'SEAT_TIMEOUT';
}

interface SeatStatusResponse {
  success: boolean;
  round_id?: string;
  max_votantes?: number;
  occupied_seats?: number;
  expired_seats?: number;
  available_seats?: number;
  is_full?: boolean;
  error_code?: 'ROUND_NOT_FOUND';
  message?: string;
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
  max_votantes: number; // Renamed from expected_voters - defines fixed voter quota
  is_active: boolean; // Whether to activate immediately after creation
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

// Strongly typed shape for imports where age is number|null
type ImportCandidate = Omit<NewCandidateForm, 'age'> & { age: number | null };

export function VotingManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<RoundWithCandidates[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rounds');
  const [selectedRound, setSelectedRound] = useState<RoundWithCandidates | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [isNewRoundDialogOpen, setIsNewRoundDialogOpen] = useState(false);
  const [isNewCandidateDialogOpen, setIsNewCandidateDialogOpen] = useState(false);
  const [isEditCandidateDialogOpen, setIsEditCandidateDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [isEditingRound, setIsEditingRound] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  // Guard to avoid double auto-finalization triggers
  const [finalizingRounds, setFinalizingRounds] = useState<Set<string>>(new Set());
  
  // Functions for multi-round voting
  const calculateCurrentMaxVotes = (round: Round) =>
    getMaxVotesAllowed(round.max_selected_candidates, round.selected_candidates_count);

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
      // Procesar resultados de la ronda actual (marca candidatos con mayoría absoluta como seleccionados)
      const { data: processResult, error: processError } = await supabase.rpc('process_round_results', {
        p_round_id: round.id,
        p_round_number: round.current_round_number
      });

      if (processError) throw processError;

      // Marcar la ronda como finalizada en la base de datos
      const { error: updateError } = await supabase
        .from('rounds')
        .update({ round_finalized: true, show_results_to_voters: false })
        .eq('id', round.id);

      if (updateError) throw updateError;

      // Cargar resultados actualizados
      await loadRoundResults(round.id, round.current_round_number);
      
      // Recargar datos de la ronda para actualizar selected_candidates_count
      await loadRounds();
      
      setShowResults(true);
      
      const result = processResult as { total_voters: number; candidates_with_majority: number; total_selected: number };
      
      toast({
        title: 'Resultados calculados',
        description: `Ronda ${round.current_round_number} finalizada. ${result.candidates_with_majority} candidato(s) con mayoría absoluta seleccionado(s).`,
      });
    } catch (error) {
      console.error('Error calculating results:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron calcular los resultados',
        variant: 'destructive',
      });
    }
  };

  const toggleResultsVisibility = async (round: RoundWithCandidates, isVisible: boolean) => {
    try {
      const { error: roundUpdateError } = await supabase
        .from('rounds')
        .update({ show_results_to_voters: isVisible })
        .eq('id', round.id);

      if (roundUpdateError) throw roundUpdateError;

      await supabase
        .from('round_results')
        .update({ is_visible: isVisible })
        .eq('round_id', round.id)
        .eq('round_number', round.current_round_number);

      await loadRounds();

      if (selectedRound?.id === round.id) {
        await loadRoundResults(round.id, round.current_round_number);
      }

      toast({
        title: isVisible ? 'Resultados publicados' : 'Resultados ocultados',
        description: isVisible 
          ? 'Los usuarios pueden ver los resultados de esta ronda' 
          : 'Los resultados han sido ocultados de los usuarios',
      });
    } catch (error) {
      console.error('Error toggling results visibility:', error);
      toast({
        title: 'Error',
        description: isVisible ? 'No se pudieron publicar los resultados' : 'No se pudieron ocultar los resultados',
        variant: 'destructive',
      });
    }
  };

  const startNextRound = async (round: RoundWithCandidates) => {
    try {
      // Ocultar resultados actuales
      await toggleResultsVisibility(round, false);
      
      // Iniciar nueva ronda usando la función SQL
      const { data: newRoundInfo, error: roundError } = await supabase.rpc('start_new_round', {
        p_round_id: round.id
      });

      if (roundError) throw roundError;

      const info = newRoundInfo as { round_number: number; max_votes_per_round: number; selected_count: number; remaining_count: number };
      
      // Limpiar estado de resultados
      setShowResults(false);
      setRoundResults([]);
      
      // Recargar datos
      await loadRounds();
      
      toast({
        title: 'Nueva ronda iniciada',
        description: `Ronda ${info.round_number} iniciada. Máximo ${info.max_votes_per_round} votos por persona. ${info.remaining_count} candidatos pendientes de seleccionar.`,
      });
    } catch (error) {
      console.error('Error starting next round:', error);
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
    max_votantes: 100,
    is_active: false
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

  // Load rounds on mount and check for finalized rounds
  useEffect(() => {
    const loadData = async () => {
      await loadRounds();
      
      // Check if any round is finalized and load its results
      const finalized = rounds.find(r => r.round_finalized && r.is_active);
      if (finalized) {
        setShowResults(true);
        await loadRoundResults(finalized.id, finalized.current_round_number);
      }
    };
    
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for finalized rounds when rounds data changes
  useEffect(() => {
    const finalized = rounds.find(r => r.round_finalized && r.is_active);
    if (finalized && !showResults) {
      setShowResults(true);
      loadRoundResults(finalized.id, finalized.current_round_number);
    }
  }, [rounds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-finalize round when vote goal reached and not yet finalized
  useEffect(() => {
    const target = rounds.find(r => r.is_active && !r.round_finalized && (r.votes_current_round || 0) >= r.max_votantes);
    if (!target) return;
    if (finalizingRounds.has(target.id)) return;
    setFinalizingRounds(prev => new Set(prev).add(target.id));
    // Trigger nextRound to process results and mark round as finalized
    nextRound(target).finally(() => {
      setFinalizingRounds(prev => {
        const copy = new Set(prev);
        copy.delete(target.id);
        return copy;
      });
    });
  }, [rounds, finalizingRounds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to real-time updates (separate effect to avoid recreating subscriptions)
  useEffect(() => {
    // Subscribe to real-time updates for votes
    const votesChannel = supabase
      .channel('votes-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'votes' 
        }, 
        (payload) => {
          debugLog('📊 Vote change detected:', payload);
          // Reload rounds when votes change - use setTimeout to avoid stale closure
          setTimeout(() => {
            // Create a new instance of loadRounds to avoid dependency issues
            const reloadRounds = async () => {
              try {
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
                      vote_count: count || 0,
                      votes_current_round: round.votes_current_round || 0
                    };
                  })
                );

                setRounds(roundsWithVoteCounts);
              } catch (error) {
                console.error('Error reloading rounds after vote change:', error);
              }
            };
            reloadRounds();
          }, 100);
        }
      )
      .subscribe((status) => {
        debugLog('📡 Votes channel status:', status);
      });

    // Subscribe to real-time updates for round_results
    const resultsChannel = supabase
      .channel('round-results-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'round_results' 
        }, 
        (payload) => {
          debugLog('📈 Round results change detected:', payload);
          // Reload round results when they change - avoid using state dependencies
          // This will be handled by the individual loadRoundResults calls
        }
      )
      .subscribe((status) => {
        debugLog('📡 Results channel status:', status);
      });

    // Cleanup subscriptions on unmount ONLY
    return () => {
      debugLog('🔌 Cleaning up subscriptions');
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(resultsChannel);
    };
  }, []); // Empty dependencies - only run once on mount // eslint-disable-line react-hooks/exhaustive-deps

  // Separate effect to reload results when selection changes
  useEffect(() => {
    if (selectedRound && showResults) {
      loadRoundResults(selectedRound.id, selectedRound.current_round_number);
    }
  }, [selectedRound, showResults]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRounds = useCallback(async () => {
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

      // Get vote counts for each round (votes_current_round viene de la DB automáticamente)
      const roundsWithVoteCounts = await Promise.all(
        (roundsData || []).map(async (round) => {
          const { count } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('round_id', round.id);
          
          return {
            ...round,
            vote_count: count || 0,
            votes_current_round: round.votes_current_round || 0 // Asegurar que existe
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
  }, [toast]);

  // Separate effect for rounds real-time subscription (after loadRounds declaration)
  useEffect(() => {
    // Subscribe to real-time updates for rounds
    const roundsChannel = supabase
      .channel('admin-rounds-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'rounds' 
        }, 
        (payload) => {
          debugLog('🔄 Round change detected:', payload);
          // Update rounds state efficiently without full reload
          const eventType = payload.eventType;
          const newRound = payload.new as RoundWithCandidates;
          const oldRound = payload.old as RoundWithCandidates;
          
          if (eventType === 'INSERT' && newRound) {
            debugLog('➕ New round inserted, need to fetch with candidates');
            // Para INSERT, necesitamos recargar para obtener los candidatos
            loadRounds();
          } else if (eventType === 'UPDATE' && newRound) {
            // Solo actualizar el estado si hay cambios significativos para el admin
            setRounds(prevRounds => {
              const existingRound = prevRounds.find(r => r.id === newRound.id);
              if (!existingRound) {
                debugLog('⚠️ Round not found in state, reloading all');
                loadRounds();
                return prevRounds;
              }
              
              // Verificar si hay cambios significativos que requieran actualización de UI
              const hasSignificantChange = (
                newRound.is_active !== existingRound.is_active ||
                newRound.is_closed !== existingRound.is_closed ||
                newRound.round_finalized !== existingRound.round_finalized ||
                newRound.show_results_to_voters !== existingRound.show_results_to_voters ||
                newRound.current_round_number !== existingRound.current_round_number ||
                newRound.votes_current_round !== existingRound.votes_current_round ||
                newRound.title !== existingRound.title ||
                newRound.description !== existingRound.description ||
                newRound.max_votantes !== existingRound.max_votantes
              );
              
              if (!hasSignificantChange) {
                debugLog('⏭️ No significant changes detected, skipping update');
                return prevRounds;
              }

              debugLog('✏️ Significant change detected, updating round in state');
              return prevRounds.map(round =>
                round.id === newRound.id ? { ...round, ...newRound, candidates: round.candidates } : round
              );
            });
            
            // Update selected round if it's the one that changed (preserving candidates)
            setSelectedRound(prev => {
              if (!prev || prev.id !== newRound.id) return prev;
              return { ...prev, ...newRound, candidates: prev.candidates };
            });
          } else if (eventType === 'DELETE' && oldRound) {
            debugLog('🗑️ Round deleted, removing from state');
            // Remove deleted round from the list
            setRounds(prevRounds => 
              prevRounds.filter(round => round.id !== oldRound.id)
            );
            // Clear selection if the deleted round was selected
            setSelectedRound(prev => {
              if (prev && prev.id === oldRound.id) {
                setSelectedCandidates(new Set()); // Clear candidates when round is deleted
                return null;
              }
              return prev;
            });
          }
        }
      )
      .subscribe((status) => {
        debugLog('📡 Rounds channel status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      debugLog('🔌 Cleaning up rounds subscription');
      supabase.removeChannel(roundsChannel);
    };
  }, [loadRounds]); // Add loadRounds as dependency

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
          max_votantes: newRoundForm.max_votantes,
          is_active: false, // Always create inactive rounds
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
        max_votantes: 100,
        is_active: false
      });
      
      // No need to reload - real-time subscription will handle the new round
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
      
      // No need to reload - real-time subscription will handle the update
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
      
      // No need to reload - real-time subscription will handle the update
      // setSelectedRound will be cleared automatically by the DELETE event handler
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
      
      // Update selected round with fresh data (sin recargar todo)
      const { data: freshRound, error: fetchError } = await supabase
        .from('rounds')
        .select('*, candidates(*)')
        .eq('id', selectedRound.id)
        .single();
      
      if (!fetchError && freshRound) {
        setSelectedRound(freshRound);
        
        // Update in the rounds list without full reload
        setRounds(prevRounds => 
          prevRounds.map(r => r.id === selectedRound.id ? freshRound : r)
        );
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el candidato',
        variant: 'destructive',
      });
    }
  };

  const openEditCandidate = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setNewCandidateForm({
      name: candidate.name,
      surname: candidate.surname,
      location: candidate.location || '',
      group_name: candidate.group_name || '',
      age: candidate.age || '',
      description: candidate.description || '',
      image_url: candidate.image_url || ''
    });
    setIsEditCandidateDialogOpen(true);
  };

  const updateCandidate = async () => {
    if (!editingCandidate) return;

    try {
      if (!newCandidateForm.name.trim() || !newCandidateForm.surname.trim()) {
        toast({
          title: 'Error',
          description: 'El nombre y apellido son obligatorios',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('candidates')
        .update({
          name: newCandidateForm.name.trim(),
          surname: newCandidateForm.surname.trim(),
          location: newCandidateForm.location.trim() || null,
          group_name: newCandidateForm.group_name.trim() || null,
          age: typeof newCandidateForm.age === 'number' ? newCandidateForm.age : null,
          description: newCandidateForm.description.trim() || null,
          image_url: newCandidateForm.image_url.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCandidate.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Éxito',
        description: 'Candidato actualizado correctamente',
      });

      setIsEditCandidateDialogOpen(false);
      setEditingCandidate(null);
      setNewCandidateForm({
        name: '',
        surname: '',
        location: '',
        group_name: '',
        age: '',
        description: '',
        image_url: ''
      });
      
      // Update selected round with fresh data (sin recargar todo)
      if (selectedRound) {
        const { data: freshRound, error: fetchError } = await supabase
          .from('rounds')
          .select('*, candidates(*)')
          .eq('id', selectedRound.id)
          .single();
        
        if (!fetchError && freshRound) {
          setSelectedRound(freshRound);
          
          // Update in the rounds list without full reload
          setRounds(prevRounds => 
            prevRounds.map(r => r.id === selectedRound.id ? freshRound : r)
          );
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el candidato',
        variant: 'destructive',
      });
    }
  };

  const parseCSV = (text: string): ImportCandidate[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const base: ImportCandidate = {
        name: '',
        surname: '',
        location: '',
        group_name: '',
        age: null,
        description: '',
        image_url: ''
      };
      const candidate: ImportCandidate = { ...base };
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        if (header === 'age') {
          candidate.age = value ? parseInt(value) : null;
        } else if (header in candidate) {
          // Cast header to the keys of ImportCandidate (excluding 'age' which is already handled)
          (candidate as Record<string, string | number | null>)[header] = value;
        }
      });
      
      return candidate;
    });
  };

  const parseXML = (text: string): ImportCandidate[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const candidates = xmlDoc.getElementsByTagName('candidate');
    
    return Array.from(candidates).map(candidate => {
      const getTagValue = (tagName: string) => {
        const element = candidate.getElementsByTagName(tagName)[0];
        return element ? element.textContent || '' : '';
      };
      
      return {
        name: getTagValue('name'),
        surname: getTagValue('surname'),
        location: getTagValue('location'),
        group_name: getTagValue('group_name'),
        age: getTagValue('age') ? parseInt(getTagValue('age')) : null,
        description: getTagValue('description'),
        image_url: getTagValue('image_url')
      };
    });
  };

  const parseJSON = (text: string): ImportCandidate[] => {
    const data = JSON.parse(text);
    return data.candidates || data;
  };

  const importCandidates = async (file: File) => {
    if (!selectedRound) return;
    
    try {
      setImportingFile(true);
      const text = await file.text();
  let candidatesData: ImportCandidate[] = [];
      
      // Parse based on file extension
      if (file.name.endsWith('.csv')) {
        candidatesData = parseCSV(text);
      } else if (file.name.endsWith('.xml')) {
        candidatesData = parseXML(text);
      } else if (file.name.endsWith('.json')) {
        candidatesData = parseJSON(text);
      } else {
        throw new Error('Formato de archivo no soportado. Use CSV, XML o JSON.');
      }
      
      // Validate and insert candidates
      const maxOrderIndex = Math.max(0, ...selectedRound.candidates.map(c => c.order_index));
      let importedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < candidatesData.length; i++) {
        const candidate = candidatesData[i];
        
        // Validate required fields
        if (!candidate.name?.trim() || !candidate.surname?.trim()) {
          errorCount++;
          continue;
        }
        
        try {
          const { error } = await supabase
            .from('candidates')
            .insert([{
              round_id: selectedRound.id,
              name: candidate.name.trim(),
              surname: candidate.surname.trim(),
              location: candidate.location?.trim() || null,
              group_name: candidate.group_name?.trim() || null,
              age: typeof candidate.age === 'number' ? candidate.age : null,
              description: candidate.description?.trim() || null,
              image_url: candidate.image_url?.trim() || null,
              order_index: maxOrderIndex + i + 1,
            }]);
          
          if (error) {
            errorCount++;
          } else {
            importedCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      // Show success message
      toast({
        title: 'Importación completada',
        description: `${importedCount} candidatos importados correctamente${errorCount > 0 ? `. ${errorCount} errores encontrados.` : '.'}`,
      });
      
      // Close dialog
      setIsImportDialogOpen(false);
      
      // Fetch fresh data for the selected round (sin recargar todo)
      const { data: freshRound, error: fetchError } = await supabase
        .from('rounds')
        .select('*, candidates(*)')
        .eq('id', selectedRound.id)
        .single();
      
      if (!fetchError && freshRound) {
        setSelectedRound(freshRound);
        
        // Update in the rounds list without full reload
        setRounds(prevRounds => 
          prevRounds.map(r => r.id === selectedRound.id ? freshRound : r)
        );
      }
      
      // Switch to candidates tab to show the imported candidates
      setActiveTab('candidates');
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron importar los candidatos',
        variant: 'destructive',
      });
    } finally {
      setImportingFile(false);
    }
  };

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importCandidates(file);
      // Reset input to allow importing the same file again
      event.target.value = '';
    }
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!selectedRound) return;
    
    if (selectedCandidates.size === selectedRound.candidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(selectedRound.candidates.map(c => c.id)));
    }
  };

  const deleteCandidate = async (candidateId: string) => {
    // Verificar si la ronda tiene votos
    if (selectedRound && selectedRound.vote_count && selectedRound.vote_count > 0) {
      toast({
        title: 'No se puede eliminar',
        description: 'No se pueden eliminar candidatos si ya hay votos en la votación',
        variant: 'destructive',
      });
      return;
    }
    
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
      
      // Update selected round with fresh data (sin recargar todo)
      if (selectedRound) {
        // Optimistic update: remove from UI immediately
        const updatedCandidates = selectedRound.candidates.filter(c => c.id !== candidateId);
        const updatedRound = { ...selectedRound, candidates: updatedCandidates };
        setSelectedRound(updatedRound);
        
        // Update in the rounds list without full reload
        setRounds(prevRounds => 
          prevRounds.map(r => r.id === selectedRound.id ? updatedRound : r)
        );
      }
      
      // Remove from selection if it was selected
      setSelectedCandidates(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el candidato',
        variant: 'destructive',
      });
    }
  };

  const deleteSelectedCandidates = async () => {
    if (!selectedRound || selectedCandidates.size === 0) return;
    
    // Verificar si la ronda tiene votos
    if (selectedRound.vote_count && selectedRound.vote_count > 0) {
      toast({
        title: 'No se puede eliminar',
        description: 'No se pueden eliminar candidatos si ya hay votos en la votación',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const candidateIds = Array.from(selectedCandidates);
      const { error } = await supabase
        .from('candidates')
        .delete()
        .in('id', candidateIds);

      if (error) {
        throw error;
      }

      toast({
        title: 'Éxito',
        description: `${candidateIds.length} candidatos eliminados correctamente`,
      });
      
      // Update selected round with fresh data
      const updatedCandidates = selectedRound.candidates.filter(c => !candidateIds.includes(c.id));
      const updatedRound = { ...selectedRound, candidates: updatedCandidates };
      setSelectedRound(updatedRound);
      
      // Update in the rounds list without full reload
      setRounds(prevRounds => 
        prevRounds.map(r => r.id === selectedRound.id ? updatedRound : r)
      );
      
      // Clear selection
      setSelectedCandidates(new Set());
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar los candidatos',
        variant: 'destructive',
      });
    }
  };

  const deleteAllCandidates = async () => {
    if (!selectedRound) return;
    
    // Verificar si la ronda tiene votos
    if (selectedRound.vote_count && selectedRound.vote_count > 0) {
      toast({
        title: 'No se puede eliminar',
        description: 'No se pueden eliminar candidatos si ya hay votos en la votación',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('round_id', selectedRound.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Éxito',
        description: 'Todos los candidatos eliminados correctamente',
      });
      
      // Update selected round with empty candidates
      const updatedRound = { ...selectedRound, candidates: [] };
      setSelectedRound(updatedRound);
      
      // Update in the rounds list without full reload
      setRounds(prevRounds => 
        prevRounds.map(r => r.id === selectedRound.id ? updatedRound : r)
      );
      
      // Clear selection
      setSelectedCandidates(new Set());
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar los candidatos',
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
                  <Label htmlFor="max_votantes">Votantes (mínimo abs: {Math.ceil(0.5 * newRoundForm.max_votantes)})</Label>
                  <Input
                    id="max_votantes"
                    type="number"
                    min="1"
                    value={newRoundForm.max_votantes}
                    onChange={(e) => setNewRoundForm(prev => ({ ...prev, max_votantes: parseInt(e.target.value) || 100 }))}
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
                  <p className="text-muted-foreground mb-4">Crea una votación para comenzar</p>
                  <Button onClick={() => setIsNewRoundDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Votación
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRound(selectedRound?.id === round.id ? null : round);
                                  setSelectedCandidates(new Set());
                                }}
                              >
                                {selectedRound?.id === round.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{selectedRound?.id === round.id ? 'Ocultar candidatos' : 'Ver candidatos'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                        <span className="text-muted-foreground">Cupo máximo:</span>
                        <p className="font-medium">{round.max_votantes}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Participación:</span>
                        <p className="font-medium">
                          {round.max_votantes > 0 
                            ? `${Math.round(((round.vote_count || 0) / round.max_votantes) * 100)}%`
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
                <div className="flex gap-2">
                  {selectedCandidates.size > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar {selectedCandidates.size} seleccionados
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar candidatos seleccionados?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminarán {selectedCandidates.size} candidatos. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteSelectedCandidates}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/comunica?round=${selectedRound.id}`)}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Importar desde SinergiaCRM
                  </Button>

                  <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Importar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Importar Candidatos</DialogTitle>
                        <DialogDescription>
                          Importa candidatos desde un archivo CSV, XML o JSON. Descarga las plantillas de ejemplo si es necesario.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {importingFile && (
                          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
                            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                            <div>
                              <p className="font-medium text-sm">Importando candidatos...</p>
                              <p className="text-xs text-muted-foreground">Por favor espera mientras procesamos el archivo</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label htmlFor="import-file">Seleccionar archivo</Label>
                          <Input
                            id="import-file"
                            type="file"
                            accept=".csv,.xml,.json"
                            onChange={handleFileImport}
                            disabled={importingFile}
                          />
                          <p className="text-sm text-muted-foreground">
                            Formatos aceptados: CSV, XML, JSON
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Plantillas de ejemplo</Label>
                          <div className="flex flex-col gap-2">
                            <a 
                              href="/candidates-example.csv" 
                              download
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <FileDown className="w-4 h-4" />
                              Descargar plantilla CSV
                            </a>
                            <a 
                              href="/candidates-example.xml" 
                              download
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <FileDown className="w-4 h-4" />
                              Descargar plantilla XML
                            </a>
                            <a 
                              href="/candidates-example.json" 
                              download
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <FileDown className="w-4 h-4" />
                              Descargar plantilla JSON
                            </a>
                          </div>
                        </div>
                        
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <p className="font-medium mb-1">Campos del archivo:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li><strong>name</strong> * (obligatorio): Nombre del candidato</li>
                            <li><strong>surname</strong> * (obligatorio): Apellidos del candidato</li>
                            <li><strong>location</strong>: Lugar de pertenencia</li>
                            <li><strong>group_name</strong>: Grupo de pertenencia</li>
                            <li><strong>age</strong>: Edad (número)</li>
                            <li><strong>description</strong>: Descripción del candidato</li>
                            <li><strong>image_url</strong>: URL de la imagen</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                          Cerrar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
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
              </div>

              {/* Edit Candidate Dialog */}
              <Dialog open={isEditCandidateDialogOpen} onOpenChange={(open) => {
                setIsEditCandidateDialogOpen(open);
                if (!open) {
                  setEditingCandidate(null);
                  setNewCandidateForm({
                    name: '',
                    surname: '',
                    location: '',
                    group_name: '',
                    age: '',
                    description: '',
                    image_url: ''
                  });
                }
              }}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Editar Candidato</DialogTitle>
                    <DialogDescription>
                      Modifica la información del candidato. Los campos marcados con * son obligatorios.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit_candidate_name">Nombre *</Label>
                        <Input
                          id="edit_candidate_name"
                          value={newCandidateForm.name}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nombre"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit_candidate_surname">Apellidos *</Label>
                        <Input
                          id="edit_candidate_surname"
                          value={newCandidateForm.surname}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, surname: e.target.value }))}
                          placeholder="Apellidos"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit_candidate_location">Lugar de pertenencia</Label>
                        <Input
                          id="edit_candidate_location"
                          value={newCandidateForm.location}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Ciudad, región..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit_candidate_group">Grupo</Label>
                        <Input
                          id="edit_candidate_group"
                          value={newCandidateForm.group_name}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, group_name: e.target.value }))}
                          placeholder="Grupo de pertenencia"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit_candidate_age">Edad</Label>
                      <Input
                        id="edit_candidate_age"
                        type="number"
                        value={newCandidateForm.age}
                        onChange={(e) => setNewCandidateForm(prev => ({ ...prev, age: e.target.value ? parseInt(e.target.value) : '' }))}
                        placeholder="Edad"
                        min="18"
                        max="100"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit_candidate_description">Descripción</Label>
                      <Textarea
                        id="edit_candidate_description"
                        value={newCandidateForm.description}
                        onChange={(e) => setNewCandidateForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descripción del candidato..."
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit_candidate_image">URL de imagen</Label>
                      <Input
                        id="edit_candidate_image"
                        value={newCandidateForm.image_url}
                        onChange={(e) => setNewCandidateForm(prev => ({ ...prev, image_url: e.target.value }))}
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditCandidateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={updateCandidate}>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {selectedRound.candidates.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox 
                    id="select-all"
                    checked={selectedCandidates.size === selectedRound.candidates.length && selectedRound.candidates.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="cursor-pointer">
                    Seleccionar todos ({selectedCandidates.size}/{selectedRound.candidates.length})
                  </label>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedRound.candidates.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mb-4" />
                      <h4 className="text-lg font-medium mb-2">No hay candidatos</h4>
                      <p className="text-muted-foreground mb-4">Agrega candidatos para esta votación</p>
                      <Button onClick={() => setIsNewCandidateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Candidato
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  selectedRound.candidates
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((candidate) => (
                      <Card 
                        key={candidate.id} 
                        className={`relative group ${selectedCandidates.has(candidate.id) ? 'ring-2 ring-primary' : ''}`}
                      >
                        <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Checkbox 
                            checked={selectedCandidates.has(candidate.id)}
                            onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                            className="bg-background"
                          />
                        </div>
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
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditCandidate(candidate)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
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
                        <span className="text-muted-foreground">Votantes ronda actual:</span>
                        <p className="text-2xl font-bold">{round.votes_current_round || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cupo máximo:</span>
                        <p className="text-2xl font-bold">{round.max_votantes}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Progreso ronda:</span>
                        <p className="text-2xl font-bold">
                          {round.max_votantes > 0 
                            ? `${Math.round(((round.votes_current_round || 0) / round.max_votantes) * 100)}%`
                            : '0%'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Seleccionados:</span>
                        <p className="text-2xl font-bold">{round.selected_candidates_count}/{round.max_selected_candidates}</p>
                      </div>
                    </div>
                    
                    {/* Indicator if round is ready for results */}
                    {round.votes_current_round >= round.max_votantes && !showResults && (
                      <div className="bg-primary/10 border border-primary rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-primary">
                          ⚡ Cupo de votantes alcanzado. La ronda puede finalizar.
                        </p>
                      </div>
                    )}

                    {/* Round Results Display */}
                    {showResults && roundResults.length > 0 && (
                      <div className="bg-muted rounded-lg p-4 mb-4 border">
                        <h5 className="font-medium mb-3 text-foreground">Resultados Ronda {round.current_round_number}</h5>
                        <div className="space-y-2">
                          {roundResults
                            .filter(result => result.vote_count > 0)
                            .sort((a, b) => b.vote_count - a.vote_count)
                            .map((result) => (
                            <div key={result.candidate_id} className="flex items-center justify-between p-2 bg-background rounded border">
                              <div>
                                <span className="font-medium text-foreground">
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
                            <div className="flex items-center gap-3 px-3 py-2 bg-muted rounded-md border">
                              <Label htmlFor={`results-visible-${round.id}`} className="text-sm font-medium cursor-pointer">
                                {round.show_results_to_voters ? (
                                  <>
                                    <Eye className="w-4 h-4 inline mr-2" />
                                    Resultados visibles para usuarios
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-4 h-4 inline mr-2" />
                                    Resultados ocultos
                                  </>
                                )}
                              </Label>
                              <Switch
                                id={`results-visible-${round.id}`}
                                checked={round.show_results_to_voters}
                                onCheckedChange={(checked) => toggleResultsVisibility(round, checked)}
                              />
                            </div>
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