import { Vote } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { generateDeviceHash, hasVotedLocally, markAsVoted, isVotingAvailable } from '@/lib/device';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Round {
  id: string;
  title: string;
  description: string;
  team: 'ECE' | 'ECL';
  current_round_number: number;
  max_votes_per_round: number;
  max_selected_candidates: number;
  selected_candidates_count: number;
  is_active: boolean;
  is_closed: boolean;
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

export function VotingPage() {
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const loadActiveRound = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get active round
      const { data: rounds, error: roundError } = await supabase
        .from('rounds')
        .select('*')
        .eq('is_active', true)
        .eq('is_closed', false)
        .limit(1);

      if (roundError) {
        console.error('Error loading round:', roundError);
        toast({
          title: 'Error',
          description: 'No se pudo cargar la información de la votación',
          variant: 'destructive',
        });
        return;
      }

      if (!rounds || rounds.length === 0) {
        toast({
          title: 'Sin votaciones activas',
          description: 'No hay votaciones disponibles en este momento',
        });
        return;
      }

      const round = rounds[0];
      setActiveRound(round);

      // Check if already voted in current round
      const deviceHash = generateDeviceHash(round.id);
      const { data: existingVotes, error: voteCheckError } = await supabase
        .from('votes')
        .select('id')
        .eq('round_id', round.id)
        .eq('device_hash', deviceHash)
        .eq('round_number', round.current_round_number);

      if (voteCheckError) {
        console.error('Error checking existing votes:', voteCheckError);
      } else {
        const alreadyVoted = (existingVotes && existingVotes.length > 0) || hasVotedLocally(round.id);
        setHasVoted(alreadyVoted);
      }

      // Load active candidates for this round (not eliminated)
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('round_id', round.id)
        .eq('is_eliminated', false)
        .order('order_index');

      if (candidateError) {
        console.error('Error loading candidates:', candidateError);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los candidatos',
          variant: 'destructive',
        });
        return;
      }

      setCandidates(candidateData || []);
    } catch (error) {
      console.error('Error in loadActiveRound:', error);
      toast({
        title: 'Error',
        description: 'Error inesperado al cargar la votación',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Handle backward compatibility for ?admin=true parameter
    const adminParam = searchParams.get('admin');
    if (adminParam === 'true') {
      navigate('/admin', { replace: true });
      return;
    }
    
    loadActiveRound();
  }, [navigate, loadActiveRound, searchParams]);

  const submitVote = async () => {
    if (selectedCandidates.length === 0 || !activeRound) return;

    try {
      setVoting(true);
      
      const deviceHash = generateDeviceHash(activeRound.id);
      const userAgent = navigator.userAgent;
      
      // Check if this device has already voted in this round
      const { data: existingVote, error: checkError } = await supabase
        .from('votes')
        .select('id')
        .eq('round_id', activeRound.id)
        .eq('device_hash', deviceHash)
        .eq('round_number', activeRound.current_round_number);

      if (checkError) {
        console.error('Error checking existing vote:', checkError);
        toast({
          title: 'Error',
          description: 'Error al verificar el voto',
          variant: 'destructive',
        });
        return;
      }

      if (existingVote && existingVote.length > 0) {
        toast({
          title: 'Ya has votado',
          description: 'Este dispositivo ya ha emitido un voto en esta ronda',
          variant: 'destructive',
        });
        setHasVoted(true);
        markAsVoted(activeRound.id);
        return;
      }

      // Submit votes for each selected candidate
      const votes = selectedCandidates.map(candidateId => ({
        round_id: activeRound.id,
        candidate_id: candidateId,
        device_hash: deviceHash,
        user_agent: userAgent,
        round_number: activeRound.current_round_number,
        ip_address: 'browser-client',
      }));

      const { error: voteError } = await supabase
        .from('votes')
        .insert(votes);

      if (voteError) {
        console.error('Error submitting vote:', voteError);
        toast({
          title: 'Error',
          description: 'No se pudo registrar el voto',
          variant: 'destructive',
        });
        return;
      }

      // Mark as voted locally
      markAsVoted(activeRound.id);
      setHasVoted(true);
      
      toast({
        title: '¡Voto registrado!',
        description: `Has votado por ${selectedCandidates.length} candidato${selectedCandidates.length > 1 ? 's' : ''}`,
      });

    } catch (error) {
      console.error('Error in submitVote:', error);
      toast({
        title: 'Error',
        description: 'Error inesperado al votar',
        variant: 'destructive',
      });
    } finally {
      setVoting(false);
    }
  };

  const toggleCandidateSelection = (candidateId: string) => {
    if (!activeRound) return;

    setSelectedCandidates(prev => {
      const isSelected = prev.includes(candidateId);
      
      if (isSelected) {
        // Remove candidate
        return prev.filter(id => id !== candidateId);
      } else {
        // Add candidate if under limit
        if (prev.length < activeRound.max_votes_per_round) {
          return [...prev, candidateId];
        } else {
          toast({
            title: 'Límite alcanzado',
            description: `Solo puedes votar por ${activeRound.max_votes_per_round} candidato${activeRound.max_votes_per_round > 1 ? 's' : ''} en esta ronda`,
            variant: 'destructive',
          });
          return prev;
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando votación...</p>
        </Card>
      </div>
    );
  }

  if (!isVotingAvailable()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold mb-4">Navegador no compatible</h1>
          <p className="text-muted-foreground">
            Tu navegador no soporta las funciones necesarias para votar.
            Por favor, usa un navegador más reciente.
          </p>
        </Card>
      </div>
    );
  }

  if (!activeRound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Vote className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold mb-2">Sin votaciones activas</h1>
          <p className="text-muted-foreground mb-4">
            No hay votaciones disponibles en este momento.
          </p>
        </Card>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <Vote className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold mb-2">¡Gracias por votar!</h1>
          <p className="text-muted-foreground">
            Tu voto ha sido registrado para la votación "{activeRound?.title}".
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{activeRound.title}</h1>
          {activeRound.description && (
            <p className="text-muted-foreground text-lg mb-4">{activeRound.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>🏆 {activeRound.team}</span>
            <span>🔄 Ronda {activeRound.current_round_number}</span>
            <span>📊 Máximo {activeRound.max_votes_per_round} voto{activeRound.max_votes_per_round > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {candidates.map((candidate) => (
            <Card 
              key={candidate.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                selectedCandidates.includes(candidate.id)
                  ? 'border-primary ring-2 ring-primary/20' 
                  : ''
              }`}
              onClick={() => toggleCandidateSelection(candidate.id)}
            >
              <CardHeader className="pb-3">
                {candidate.image_url && (
                  <div className="aspect-square overflow-hidden rounded-lg mb-3">
                    <img 
                      src={candidate.image_url} 
                      alt={`${candidate.name} ${candidate.surname}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardTitle className="text-lg">{candidate.name} {candidate.surname}</CardTitle>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {candidate.age && <div>🎂 {candidate.age} años</div>}
                  {candidate.location && <div>📍 {candidate.location}</div>}
                  {candidate.group_name && <div>👥 {candidate.group_name}</div>}
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
          ))}
        </div>

        <div className="text-center">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {selectedCandidates.length > 0 ? (
                `Has seleccionado ${selectedCandidates.length} de ${activeRound.max_votes_per_round} candidato${activeRound.max_votes_per_round > 1 ? 's' : ''}`
              ) : (
                `Selecciona entre 1 y ${activeRound.max_votes_per_round} candidato${activeRound.max_votes_per_round > 1 ? 's' : ''}`
              )}
            </p>
          </div>
          <Button 
            size="lg"
            onClick={submitVote}
            disabled={selectedCandidates.length === 0 || voting}
            className="min-w-32"
          >
            {voting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Votando...
              </>
            ) : (
              <>
                <Vote className="w-4 h-4 mr-2" />
                Votar por {selectedCandidates.length} candidato{selectedCandidates.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
          {selectedCandidates.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Has seleccionado: {selectedCandidates.map(id => {
                const candidate = candidates.find(c => c.id === id);
                return `${candidate?.name} ${candidate?.surname}`;
              }).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}