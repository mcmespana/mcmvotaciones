import { Vote, Trash2, ShieldCheck, Trophy, BarChart2, MapPin, Users } from 'lucide-react';
import { flushSync } from 'react-dom';
import { formatSurname } from '@/lib/candidateFormat';
import { useState } from 'react';
import { isVotingAvailable } from '@/lib/device';
import { useToast } from '@/hooks/use-toast';
import { GroupedCandidateList } from '@/components/voting/GroupedCandidateList';
import { VoteSubmitAnimation } from '@/components/voting/VoteSubmitAnimation';
import { VotingTutorial } from '@/components/voting/VotingTutorial';
import { AccessCodeInput, isAccessCodeVerified } from '@/components/voting/AccessCodeInput';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { VoteTicket } from '@/components/voting/VoteTicket';
import { useVotingPage } from './voting/hooks/useVotingPage';
import type { Round } from './voting/hooks/useVotingPage';
import { Spinner } from '@/components/ui-avd/Spinner';

type PreviewMode = 'tutorial' | 'anim' | 'ticket';

function getPreviewMode(): PreviewMode | null {
  const value = new URLSearchParams(window.location.search).get('preview');
  if (value === 'tutorial' || value === 'anim' || value === 'ticket') return value;
  return null;
}

export function VotingPage() {
  const { toast } = useToast();
  const previewMode = getPreviewMode();
  const [previewAnimVisible, setPreviewAnimVisible] = useState(previewMode === 'anim');

  const {
    activeRound: activeRoundFromHook, candidates, loading,
    results, loadingResults,
    selectedCandidates, voting, hasVoted,
    showSubmitAnimation, voteHashCode, voteReceipt,
    accessCodeVerified, accessCodeError, accessCodeLoading,
    seatId: _seatId, seatLoading, seatError,
    confirmVoteOpen, setConfirmVoteOpen,
    tabHidden, maxVotesThisRound,
    selectedCandidateNames, selectedCandidateShortNames,
    loadActiveRound,
    handleAccessCode, handleSubmitAnimationComplete,
    copyVerificationCode, submitVote,
    toggleCandidateSelection, clearSelection, openVoteConfirmation,
  } = useVotingPage({ toast });

  // Preview mode injects a fake round for ticket preview
  const [previewRound] = useState<Round | null>(() => previewMode === 'ticket' ? {
    id: 'preview-round',
    slug: 'preview-round',
    title: 'Preview Votacion',
    description: 'Vista local del ticket de voto',
    year: new Date().getFullYear(),
    team: 'ECE',
    max_votantes: 100,
    max_votes_per_round: 3,
    max_selected_candidates: 6,
    selected_candidates_count: 3,
    access_code: null,
    census_mode: 'maximum',
    is_active: true,
    is_closed: false,
    is_voting_open: true,
    join_locked: false,
    round_finalized: false,
    show_results_to_voters: false,
    show_ballot_summary_projection: false,
    show_final_gallery_projection: false,
    public_candidates_enabled: true,
    current_round_number: 2,
    votes_current_round: 0,
    voting_type_name: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : null);

  const activeRound = previewMode === 'ticket' ? previewRound : activeRoundFromHook;

  if (previewMode) {
    const previewLinks = (
      <div className="flex gap-2 flex-wrap">
        <a className="avd-btn avd-btn-sm" href="/?preview=tutorial">tutorial</a>
        <a className="avd-btn avd-btn-sm" href="/?preview=anim">anim</a>
        <a className="avd-btn avd-btn-sm" href="/?preview=ticket">ticket</a>
        <a className="avd-btn avd-btn-sm" href="/">normal</a>
      </div>
    );

    if (previewMode === 'tutorial') {
      return (
        <div className="pub-page flex items-center justify-center p-5 flex-col gap-3.5">
          <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg w-full max-w-[560px] p-5 flex justify-between items-center gap-3">
            <div>
              <h1 className="m-0 text-lg font-extrabold text-avd-fg">Preview local: VotingTutorial</h1>
              <p className="mt-1 mb-0 text-[13px] text-avd-fg-muted">
                Usa <code>?preview=tutorial</code>, <code>?preview=anim</code> o <code>?preview=ticket</code>.
              </p>
            </div>
            {previewLinks}
          </div>
          <VotingTutorial forceOpen roundId="preview-round" />
        </div>
      );
    }

    if (previewMode === 'anim') {
      return (
        <div className="pub-page flex items-center justify-center p-5 flex-col gap-3.5">
          <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg w-full max-w-[560px] p-5 flex justify-between items-center gap-3">
            <div>
              <h1 className="m-0 text-lg font-extrabold text-avd-fg">Preview local: VoteSubmitAnimation</h1>
              <p className="mt-1 mb-0 text-[13px] text-avd-fg-muted">
                Animacion independiente del flujo real de voto.
              </p>
            </div>
            {previewLinks}
          </div>
          <button
            className="avd-btn avd-btn-primary"
            onClick={() => { setPreviewAnimVisible(false); window.setTimeout(() => setPreviewAnimVisible(true), 30); }}
          >
            Repetir animacion
          </button>
          <VoteSubmitAnimation isVisible={previewAnimVisible} onComplete={() => setPreviewAnimVisible(false)} voteHash="VT-DEMO-2026" />
        </div>
      );
    }

    // ticket preview
    return (
      <div className="pub-page flex items-center justify-center p-5 relative">
        <div className="absolute right-4 top-4 z-[20]"><ThemeToggle mode="inline" /></div>
        <VoteTicket
          roundTitle={activeRound?.title ?? ''}
          roundNumber={activeRound?.current_round_number ?? 0}
          voteHashCode="VT-DEMO-2026"
          voteReceipt={{ roundId: 'preview-round', roundNumber: 2, voteCode: 'VT-DEMO-2026', votes: ['Ana G.', 'Maria R.', 'Lucia P.'], createdAt: new Date().toISOString() }}
          onCopy={copyVerificationCode}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pub-page flex items-center justify-center p-5">
        <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg w-full max-w-[420px] p-10 text-center">
          <Spinner size="md" className="mx-auto mb-4" />
          <p className="text-avd-fg-muted text-sm">Cargando votación...</p>
        </div>
      </div>
    );
  }

  if (!isVotingAvailable()) {
    return (
      <div className="pub-page flex items-center justify-center p-5">
        <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg w-full max-w-[420px] p-10 text-center">
          <h1 className="text-lg font-bold mb-3 text-avd-fg">Navegador no compatible</h1>
          <p className="text-avd-fg-muted text-sm">
            Tu navegador no soporta las funciones necesarias para votar.
            Por favor, usa un navegador más reciente.
          </p>
        </div>
      </div>
    );
  }

  if (!activeRound) {
    return (
      <div className="pub-page flex items-center justify-center p-5 min-h-screen">
        <ThemeToggle />
        <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg w-full max-w-[420px] px-8 py-10 text-center relative overflow-hidden">
          <div className="avd-accent-bar avd-accent-bar--4 avd-accent-bar--rainbow" />
          <div className="relative mx-auto mb-6 w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-avd-brand-bg border-2 border-avd-brand-border" style={{ animation: 'pulse-ring 2s ease-in-out infinite' }} />
            <div className="relative w-full h-full avd-icon-circle avd-icon-circle--brand"><Vote className="w-9 h-9" /></div>
          </div>
          <h1 className="text-xl font-extrabold mb-2.5 text-avd-fg tracking-[-0.01em]">Esperando siguiente votación…</h1>
          <p className="text-avd-fg-muted text-sm mb-6 leading-relaxed">No hay votaciones disponibles en este momento. La página se actualizará automáticamente.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--avd-brand)', opacity: 0.7, animation: `dot-pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeRound.access_code && !accessCodeVerified && !isAccessCodeVerified(activeRound.id)) {
    return (
      <AccessCodeInput onSubmit={handleAccessCode} loading={accessCodeLoading} error={accessCodeError} roundTitle={activeRound.title} />
    );
  }

  if (seatLoading) {
    return (
      <div className="pub-page flex items-center justify-center p-5">
        <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg w-full max-w-[420px] p-10 text-center">
          <Spinner size="md" className="mx-auto mb-4" />
          <p className="text-avd-fg-muted text-sm">Validando tu asiento...</p>
        </div>
      </div>
    );
  }

  if (seatError && !hasVoted) {
    return (
      <div className="pub-page flex items-center justify-center p-5">
        <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg w-full max-w-[420px] p-10 text-center">
          <h1 className="text-lg font-bold mb-2 text-avd-fg">No se pudo acceder a la sala</h1>
          <p className="text-avd-fg-muted text-sm mb-6">{seatError}</p>
          <button className="avd-btn avd-btn-primary mx-auto" onClick={() => { void loadActiveRound(); }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (maxVotesThisRound === 0 && !hasVoted && !activeRound.round_finalized && !activeRound.is_closed) {
    return (
      <div className="pub-page flex items-center justify-center p-5">
        <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg w-full max-w-[420px] p-10 text-center">
          <div className="avd-icon-circle avd-icon-circle--ok mx-auto mb-5 w-[72px] h-[72px]">
            <Vote className="w-8 h-8" />
          </div>
          <span className="avd-chip avd-chip-ok mb-5 h-8 text-[13px]">Votación completada</span>
          <p className="text-avd-fg-muted text-[13px] mb-1.5">
            Ya se han seleccionado los {activeRound.max_selected_candidates} candidatos requeridos.
          </p>
          <p className="text-[13px] text-avd-fg-faint">No se admitirán más votos en esta votación.</p>
        </div>
      </div>
    );
  }

  if (activeRound.is_active && !activeRound.is_voting_open && !activeRound.round_finalized && !activeRound.is_closed && !hasVoted) {
    const isPaused = activeRound.join_locked;
    return (
      <div className="pub-page flex items-center justify-center p-5 relative overflow-hidden">
        <div className="absolute top-5 right-5 z-10"><ThemeToggle /></div>
        <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: isPaused ? 'color-mix(in oklch, var(--avd-warn) 8%, transparent)' : 'color-mix(in oklch, var(--avd-brand) 8%, transparent)', filter: 'blur(60px)', top: '10%', left: '-10%', animation: 'proj-orb-slow-a 18s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: isPaused ? 'color-mix(in oklch, var(--avd-warn) 6%, transparent)' : 'color-mix(in oklch, var(--avd-brand) 6%, transparent)', filter: 'blur(50px)', bottom: '5%', right: '-5%', animation: 'proj-orb-slow-b 22s ease-in-out infinite', pointerEvents: 'none' }} />
        <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg w-full max-w-[420px] overflow-hidden text-center relative z-[1]" style={{ animation: 'card-enter 0.4s cubic-bezier(0.2,0.75,0.2,1) both' }}>
          <div style={{ height: 3, background: isPaused ? 'linear-gradient(90deg, var(--avd-warn), var(--avd-warn-600))' : 'linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))' }} />
          <div className="p-10">
            <div style={{ margin: '0 auto 20px', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isPaused ? 'var(--avd-warn-bg)' : 'var(--avd-brand-bg)', border: `1px solid ${isPaused ? 'color-mix(in oklch, var(--avd-warn) 30%, transparent)' : 'var(--avd-brand-border)'}`, color: isPaused ? 'var(--avd-warn)' : 'var(--avd-brand)', animation: 'breathe 3.5s ease-in-out infinite' }}>
              <Vote className="w-8 h-8" />
            </div>
            <span className={`avd-chip ${isPaused ? 'avd-chip-warn' : 'avd-chip-brand'} mb-5 h-8 text-[13px]`}>
              {isPaused ? "Ronda en Pausa" : "Sala Abierta"}
            </span>
            <p className="text-avd-fg-muted text-[13px] leading-relaxed mb-5 font-medium">
              {isPaused
                ? `Sigues conectado con éxito a la sala "${activeRound.title}". Por favor, espera a que la administración reanude la sesión.`
                : `Has accedido a "${activeRound.title}". Todo está listo, solo espera a que el administrador dé luz verde para comenzar.`}
            </p>
            <div className="flex items-center justify-center gap-1.5 mb-5">
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: isPaused ? 'var(--avd-warn)' : 'var(--avd-brand)', display: 'inline-block', animation: `dot-bounce 1.4s ease-in-out ${i * 0.22}s infinite` }} />
              ))}
            </div>
            <div className="avd-secure-badge" style={{ animation: 'ok-glow 3s ease-in-out infinite' }}>
              <ShieldCheck className="w-[13px] h-[13px] shrink-0" />
              Asiento validado y seguro
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ((activeRound.is_closed || !activeRound.is_active || activeRound.round_finalized) && !hasVoted && !(activeRound.show_results_to_voters && activeRound.round_finalized)) {
    const label = activeRound.is_closed ? 'Votación Cerrada' : activeRound.round_finalized ? 'Ronda Finalizada' : 'Sesión Pausada';
    return (
      <div className="pub-page flex items-center justify-center p-5">
        <div className="absolute top-5 right-5 z-10"><ThemeToggle /></div>
        <div className="bg-avd-surface rounded-avd-lg shadow-avd-md w-full max-w-[420px] overflow-hidden text-center" style={{ border: '1px solid color-mix(in oklch, var(--avd-warn) 35%, transparent)' }}>
          <div className="avd-accent-bar avd-accent-bar--warn" />
          <div className="p-10">
            <div className="avd-icon-circle avd-icon-circle--warn mx-auto mb-5 w-[72px] h-[72px]">
              <Vote className="w-8 h-8" />
            </div>
            <span className="avd-chip avd-chip-warn mb-5 h-8 text-[13px]">{label}</span>
            <p className="text-avd-fg-muted text-[13px] font-medium mb-6 leading-relaxed">
              {activeRound.is_closed
                ? `La votación "${activeRound.title}" ha llegado a su fin y las urnas se han cerrado definitivamente.`
                : activeRound.round_finalized
                ? `La ronda ${activeRound.current_round_number} de "${activeRound.title}" terminó. No es posible enviar más papeletas en este momento.`
                : `La votación de "${activeRound.title}" se encuentra en pausa. Mantente a la espera de instrucciones.`
              }
            </p>
            {(activeRound.is_closed || activeRound.round_finalized) && (
              <div className="avd-warn-notice">
                <span>⏳</span> Las urnas ya no aceptan respuestas.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeRound?.show_results_to_voters && activeRound?.round_finalized && !hasVoted) {
    return (
      <div className="pub-page px-4 pt-4 pb-16">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg overflow-hidden text-center">
            <div className="avd-accent-bar" />
            <div className="px-8 pt-8 pb-6">
              <div className="avd-icon-circle avd-icon-circle--brand mx-auto mb-5 w-[60px] h-[60px]">
                <Vote className="w-7 h-7" />
              </div>
              <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-avd-fg mb-2">Resumen de Votación</h1>
              <p className="text-avd-fg-muted text-[13px] font-medium mb-4">Resultados finales — "{activeRound.title}"</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="avd-chip avd-chip-warn" style={{ height: 24, fontSize: 11 }}>🏆 {activeRound.team}</span>
                <span className="avd-chip avd-chip-brand" style={{ height: 24, fontSize: 11 }}>Ronda {activeRound.current_round_number}</span>
              </div>
            </div>
          </div>

          {candidates.some(c => c.is_selected) && (
            <div className="bg-avd-surface rounded-avd-lg p-6" style={{ border: '1px solid color-mix(in oklch, var(--avd-ok) 35%, transparent)' }}>
              <h2 className="flex items-center gap-2 text-lg font-bold text-avd-ok-fg mb-1.5">
                <Trophy size={20} />Candidatos Seleccionados
              </h2>
              <p className="mb-4 text-[13px] text-avd-fg-muted">Mayoría absoluta (&gt;50% de los votos)</p>
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {candidates.filter(c => c.is_selected).map((candidate) => (
                  <div key={candidate.id} className="flex items-center gap-3 bg-avd-ok-bg rounded-avd-md p-3.5" style={{ border: '1px solid color-mix(in oklch, var(--avd-ok) 25%, transparent)' }}>
                    <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-avd-ok text-white font-bold">✓</div>
                    <div>
                      <div className="font-bold text-avd-ok-fg text-sm flex items-center gap-1.5 flex-wrap">
                        {candidate.name} {formatSurname(candidate.surname)}
                        {candidate.selected_in_round != null && (
                          <span className="avd-chip avd-chip-brand" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>R{candidate.selected_in_round}</span>
                        )}
                      </div>
                      {candidate.location && <div className="text-xs text-avd-fg-muted mt-0.5">{candidate.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-avd-surface border border-avd-border rounded-avd-lg shadow-avd-lg p-6">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2 text-avd-fg">
              <BarChart2 size={22} />Resultados de Ronda {activeRound.current_round_number}
            </h2>
            <p className="text-[13px] text-avd-fg-muted mb-5">Votación finalizada</p>
            {loadingResults ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-center text-avd-fg-muted py-8">Aún no hay resultados disponibles.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {results.map((result, index) => {
                  const candidate = candidates.find(c => c.id === result.candidate_id);
                  if (!candidate) return null;
                  const isSelected = candidate.is_selected;
                  const hasMajority = result.percentage > 50;
                  return (
                    <div key={result.candidate_id} className="flex items-center gap-3 p-4 rounded-avd-md" style={{ border: isSelected ? '1px solid color-mix(in oklch, var(--avd-ok) 40%, transparent)' : hasMajority ? '1px solid var(--avd-brand-border)' : '1px solid var(--avd-border)', background: isSelected ? 'var(--avd-ok-bg)' : hasMajority ? 'var(--avd-brand-bg)' : 'var(--avd-bg-sunken)' }}>
                      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-base" style={{ background: isSelected ? 'var(--avd-ok)' : 'var(--avd-brand-bg)', color: isSelected ? 'white' : 'var(--avd-brand)' }}>
                        {isSelected ? '✓' : index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-base flex items-center gap-2 flex-wrap text-avd-fg">
                          {candidate.name} {formatSurname(candidate.surname)}
                          {isSelected && <span className="avd-chip avd-chip-ok" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>SELECCIONADO</span>}
                          {isSelected && candidate.selected_in_round != null && <span className="avd-chip avd-chip-brand" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>R{candidate.selected_in_round}</span>}
                          {hasMajority && !isSelected && <span className="avd-chip avd-chip-brand" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>+50%</span>}
                        </div>
                        {(candidate.location || candidate.group_name) && (
                          <div className="text-xs text-avd-fg-muted mt-0.5 flex items-center gap-1 flex-wrap">
                            {candidate.location && <><MapPin size={10} />{candidate.location}</>}
                            {candidate.location && candidate.group_name && <span> • </span>}
                            {candidate.group_name && <><Users size={10} />{candidate.group_name}</>}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ background: 'var(--avd-border-soft)' }}>
                            <div style={{ height: '100%', borderRadius: 999, transition: 'width 1s ease', background: isSelected ? 'var(--avd-ok)' : 'var(--avd-brand)', width: `${Math.min(Math.max(result.percentage, 0), 100)}%` }} />
                          </div>
                          <span className="text-sm font-semibold min-w-[56px] text-right text-avd-fg">{result.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[22px] font-bold text-avd-fg">{result.vote_count}</div>
                        <div className="text-[11px] text-avd-fg-muted uppercase">votos</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="pub-page flex items-center justify-center p-5 relative">
        <div className="absolute right-4 top-4 z-[20]"><ThemeToggle mode="inline" /></div>
        <VoteTicket
          roundTitle={activeRound?.title ?? ''}
          roundNumber={activeRound?.current_round_number ?? 0}
          voteHashCode={voteHashCode}
          voteReceipt={voteReceipt}
          onCopy={copyVerificationCode}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background px-3 pb-36 pt-3 sm:px-4 sm:pt-4">
      <VoteSubmitAnimation isVisible={showSubmitAnimation} onComplete={handleSubmitAnimationComplete} voteHash={voteHashCode} />

      {tabHidden && (
        <div aria-hidden="true" className="fixed inset-0 z-[150] pointer-events-none flex items-center justify-center flex-col gap-3" style={{ background: 'var(--background)' }}>
          <span className="text-[40px]">🔒</span>
          <span className="text-base font-bold text-foreground">Votación privada</span>
          <span className="text-[13px] text-muted-foreground">Vuelve a esta pestaña para continuar</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-5 pt-1 text-center sm:mb-7 space-y-1.5">
          <h1 className="font-headline text-3xl font-black tracking-tight sm:text-5xl pb-0.5">{activeRound.title}</h1>
          {activeRound.description && (
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">{activeRound.description}</p>
          )}
        </div>
        <div className="mb-6 sm:mb-8">
          <GroupedCandidateList
            candidates={candidates}
            selectedCandidates={selectedCandidates}
            onToggleCandidate={toggleCandidateSelection}
            tutorialRoundId={activeRound.id}
          />
        </div>
      </div>

      {!showSubmitAnimation && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t-2 border-outline-variant bg-surface-container-lowest shadow-[0_-8px_24px_-12px_hsl(var(--outline-variant)/0.45)] dark:border-outline-variant dark:bg-surface-container-low px-4 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))]" style={{ backgroundColor: "hsl(var(--surface-container-lowest))", opacity: 1 }}>
          <div className="mx-auto max-w-4xl space-y-2">
            <div className="min-w-0">
              {selectedCandidates.length > 0 ? (
                <p className="truncate text-sm font-semibold text-foreground">{selectedCandidateShortNames.join(' · ')}</p>
              ) : (
                <p className="text-sm text-muted-foreground/55">Selecciona candidatos</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Ronda {activeRound.current_round_number} - Máx. {maxVotesThisRound} voto{maxVotesThisRound > 1 ? 's' : ''}</p>
              <div className="flex-1" />
              <button type="button" onClick={clearSelection} disabled={selectedCandidates.length === 0 || voting} aria-label="Borrar selección" className="avd-btn avd-btn-danger w-[42px] h-[42px] p-0">
                <Trash2 className="w-[18px] h-[18px]" />
              </button>
              <button type="button" onClick={openVoteConfirmation} disabled={maxVotesThisRound === 0 || selectedCandidates.length === 0 || voting} className="avd-btn shrink-0" style={{ height: 42, background: 'var(--avd-ok)', color: 'white', borderColor: 'var(--avd-ok)', fontWeight: 700, padding: '0 18px' }}>
                {voting ? (
                  <><div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 8 }} />Votando...</>
                ) : (
                  <><Vote className="w-[18px] h-[18px] mr-2" />Votar ({selectedCandidates.length})</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmVoteOpen && (
        <div className="avd-dialog-overlay" style={{ zIndex: 110 }} onMouseDown={(e) => { if (e.target === e.currentTarget && !voting) setConfirmVoteOpen(false); }}>
          <div className="avd-dialog" style={{ maxWidth: 420, padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="avd-accent-bar avd-accent-bar--4 avd-accent-bar--green" />
            <div className="px-8 pt-8 pb-5 text-center">
              <div className="mx-auto mb-5 w-16 h-16 flex items-center justify-center rounded-2xl" style={{ background: '#d1fae5', border: '1px solid #6ee7b7' }}>
                <Vote className="w-8 h-8" style={{ color: '#059669' }} strokeWidth={1.7} />
              </div>
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-avd-fg mb-2">Confirmar voto</h2>
              <p className="text-[13px] leading-relaxed text-avd-fg-muted">Revisa tu selección. Esta acción no se puede deshacer.</p>
            </div>
            <div className="px-6 pb-5">
              <div className="overflow-hidden rounded-avd-md border border-avd-border bg-avd-bg-sunken">
                <div className="flex items-center gap-2 border-b border-avd-border px-4 py-2.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#10b981' }} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-avd-fg-muted">Tu selección</p>
                </div>
                <div className="px-4 py-3 flex flex-col gap-2">
                  {selectedCandidateNames.map((name, index) => (
                    <div key={`${name}-${index}`} className="flex items-center gap-3">
                      <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-avd-brand-bg text-[10px] font-bold text-avd-brand">{index + 1}</span>
                      <span className="text-[13px] font-semibold text-avd-fg">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="avd-dialog-foot" style={{ justifyContent: 'stretch', gap: 8 }}>
              <button disabled={voting} onClick={() => setConfirmVoteOpen(false)} className="avd-btn flex-1 justify-center h-11">Cancelar</button>
              <button disabled={voting} onClick={() => submitVote({ flushConfirmClose: () => flushSync(() => setConfirmVoteOpen(false)) })} className="avd-btn flex-1 justify-center h-11" style={{ background: 'var(--avd-ok)', color: 'white', borderColor: 'var(--avd-ok)', fontWeight: 700 }}>
                Confirmar voto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
