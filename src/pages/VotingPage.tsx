import { Vote, Trash2, ShieldCheck } from 'lucide-react';
import { flushSync } from 'react-dom';
import { useState } from 'react';
import { isVotingAvailable } from '@/lib/device';
import { useToast } from '@/hooks/use-toast';
import { GroupedCandidateList } from '@/components/voting/GroupedCandidateList';
import { VoteSubmitAnimation } from '@/components/voting/VoteSubmitAnimation';
import { VotingTutorial } from '@/components/voting/VotingTutorial';
import { AccessCodeInput, isAccessCodeVerified } from '@/components/voting/AccessCodeInput';
import { HeaderControls } from '@/components/shared/HeaderControls';
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
        <div className="pub-page flex items-center justify-center p-5 flex-col gap-[14px]">
          <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-lg)] w-full max-w-[560px] p-5 flex justify-between items-center gap-3">
            <div>
              <h1 className="m-0 text-[18px] font-extrabold text-[var(--avd-fg)]">Preview local: VotingTutorial</h1>
              <p className="mt-1 mb-0 text-[13px] text-[var(--avd-fg-muted)]">
                Usa <code>?preview=tutorial</code>, <code>?preview=anim</code> o <code>?preview=ticket</code>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {previewLinks}
              <HeaderControls mode="inline" />
            </div>
          </div>
          <VotingTutorial forceOpen roundId="preview-round" />
        </div>
      );
    }

    if (previewMode === 'anim') {
      return (
        <div className="pub-page flex items-center justify-center p-5 flex-col gap-[14px]">
          <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-lg)] w-full max-w-[560px] p-5 flex justify-between items-center gap-3">
            <div>
              <h1 className="m-0 text-[18px] font-extrabold text-[var(--avd-fg)]">Preview local: VoteSubmitAnimation</h1>
              <p className="mt-1 mb-0 text-[13px] text-[var(--avd-fg-muted)]">
                Animacion independiente del flujo real de voto.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {previewLinks}
              <HeaderControls mode="inline" />
            </div>
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
        <div className="absolute right-4 top-4 z-20"><HeaderControls mode="inline" /></div>
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
        <HeaderControls mode="floating" />
        <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-lg)] w-full max-w-[420px] p-10 text-center">
          <Spinner size="md" className="mx-auto mb-4" />
          <p className="text-[var(--avd-fg-muted)] text-sm">Cargando votación...</p>
        </div>
      </div>
    );
  }

  if (!isVotingAvailable()) {
    return (
      <div className="pub-page flex items-center justify-center p-5">
        <HeaderControls mode="floating" />
        <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-lg)] w-full max-w-[420px] p-10 text-center">
          <h1 className="text-[18px] font-bold mb-3 text-[var(--avd-fg)]">Navegador no compatible</h1>
          <p className="text-[var(--avd-fg-muted)] text-sm">
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
        <HeaderControls mode="floating" />
        <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-lg)] w-full max-w-[420px] px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 shimmer-bar-rainbow" />
          <div className="relative mx-auto mb-6 w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-[var(--avd-brand-bg)] border-2 border-[var(--avd-brand-border)] animate-[pulse-ring_2s_ease-in-out_infinite]" />
            <div className="relative w-full h-full rounded-full bg-[var(--avd-brand-bg)] flex items-center justify-center text-[var(--avd-brand)]">
              <Vote className="w-9 h-9" />
            </div>
          </div>
          <h1 className="text-[20px] font-extrabold mb-2.5 text-[var(--avd-fg)] tracking-[-0.01em]">Esperando siguiente votación…</h1>
          <p className="text-[var(--avd-fg-muted)] text-sm mb-6 leading-relaxed">No hay votaciones disponibles en este momento. La página se actualizará automáticamente.</p>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-[var(--avd-brand)] opacity-70" style={{ animation: `dot-pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
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
        <HeaderControls mode="floating" />
        <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-lg)] w-full max-w-[420px] p-10 text-center">
          <Spinner size="md" className="mx-auto mb-4" />
          <p className="text-[var(--avd-fg-muted)] text-sm">Validando tu asiento...</p>
        </div>
      </div>
    );
  }

  if (seatError && !hasVoted) {
    return (
      <div className="pub-page flex items-center justify-center p-5">
        <HeaderControls mode="floating" />
        <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-lg)] w-full max-w-[420px] p-10 text-center">
          <h1 className="text-[18px] font-bold mb-2 text-[var(--avd-fg)]">No se pudo acceder a la sala</h1>
          <p className="text-[var(--avd-fg-muted)] text-sm mb-6">{seatError}</p>
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
        <HeaderControls mode="floating" />
        <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-lg)] w-full max-w-[420px] p-10 text-center">
          <div className="mx-auto mb-5 w-[72px] h-[72px] flex items-center justify-center rounded-full bg-[var(--avd-ok-bg)] border border-[color-mix(in_oklch,var(--avd-ok)_30%,transparent)] text-[var(--avd-ok)]">
            <Vote className="w-8 h-8" />
          </div>
          <span className="avd-chip avd-chip-ok mb-5 h-8 text-[13px]">Votación completada</span>
          <p className="text-[var(--avd-fg-muted)] text-[13px] mb-1.5">
            Ya se han seleccionado los {activeRound.max_selected_candidates} candidatos requeridos.
          </p>
          <p className="text-[13px] text-[var(--avd-fg-faint)]">No se admitirán más votos en esta votación.</p>
        </div>
      </div>
    );
  }

  if (activeRound.is_active && !activeRound.is_voting_open && !activeRound.round_finalized && !activeRound.is_closed && !hasVoted) {
    const isPaused = activeRound.join_locked;
    return (
      <div className="pub-page flex items-center justify-center p-5 relative overflow-hidden">
        <HeaderControls mode="floating" />
        <div className={`absolute w-[280px] h-[280px] rounded-full blur-[60px] top-[10%] -left-[10%] animate-[proj-orb-slow-a_18s_ease-in-out_infinite] pointer-events-none ${isPaused ? 'bg-[color-mix(in_oklch,var(--avd-warn)_8%,transparent)]' : 'bg-[color-mix(in_oklch,var(--avd-brand)_8%,transparent)]'}`} />
        <div className={`absolute w-[220px] h-[220px] rounded-full blur-[50px] bottom-[5%] -right-[5%] animate-[proj-orb-slow-b_22s_ease-in-out_infinite] pointer-events-none ${isPaused ? 'bg-[color-mix(in_oklch,var(--avd-warn)_6%,transparent)]' : 'bg-[color-mix(in_oklch,var(--avd-brand)_6%,transparent)]'}`} />
        <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-lg)] w-full max-w-[420px] overflow-hidden text-center animate-[card-enter_0.4s_cubic-bezier(0.2,0.75,0.2,1)_both] relative z-[1]">
          <div className={`h-[3px] ${isPaused ? 'bg-gradient-to-r from-[var(--avd-warn)] to-[var(--avd-warn-600)]' : 'bg-gradient-to-r from-[var(--avd-brand-400)] to-[var(--avd-brand-600)]'}`} />
          <div className="p-10">
            <div className={`mx-auto mb-5 w-[72px] h-[72px] flex items-center justify-center rounded-full animate-[breathe_3.5s_ease-in-out_infinite] ${isPaused ? 'bg-[var(--avd-warn-bg)] border border-[color-mix(in_oklch,var(--avd-warn)_30%,transparent)] text-[var(--avd-warn)]' : 'bg-[var(--avd-brand-bg)] border border-[var(--avd-brand-border)] text-[var(--avd-brand)]'}`}>
              <Vote className="w-8 h-8" />
            </div>
            <span className={`avd-chip ${isPaused ? 'avd-chip-warn' : 'avd-chip-brand'} mb-5 h-8 text-[13px]`}>
              {isPaused ? "Ronda en Pausa" : "Sala Abierta"}
            </span>
            <p className="text-[var(--avd-fg-muted)] text-[13px] leading-relaxed mb-5 font-medium">
              {isPaused
                ? `Sigues conectado con éxito a la sala "${activeRound.title}". Por favor, espera a que la administración reanude la sesión.`
                : `Has accedido a "${activeRound.title}". Todo está listo, solo espera a que el administrador dé luz verde para comenzar.`}
            </p>
            <div className="flex items-center justify-center gap-[5px] mb-5">
              {[0, 1, 2].map(i => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full inline-block ${isPaused ? 'bg-[var(--avd-warn)]' : 'bg-[var(--avd-brand)]'}`} style={{ animation: `dot-bounce 1.4s ease-in-out ${i * 0.22}s infinite` }} />
              ))}
            </div>
            <div className="inline-flex items-center gap-1.5 bg-[var(--avd-ok-bg)] border border-[color-mix(in_oklch,var(--avd-ok)_30%,transparent)] rounded-full px-[14px] py-1.5 text-xs font-semibold text-[var(--avd-ok-fg)] cursor-default select-none animate-[ok-glow_3s_ease-in-out_infinite]">
              <ShieldCheck className="w-[13px] h-[13px] shrink-0" />
              Asiento validado y seguro
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ((activeRound.is_closed || !activeRound.is_active || activeRound.round_finalized) && !hasVoted) {
    const label = activeRound.is_closed ? 'Votación Cerrada' : activeRound.round_finalized ? 'Ronda Finalizada' : 'Sesión Pausada';
    return (
      <div className="pub-page flex items-center justify-center p-5">
        <HeaderControls mode="floating" />
        <div className="bg-[var(--avd-surface)] border border-[color-mix(in_oklch,var(--avd-warn)_35%,transparent)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-md)] w-full max-w-[420px] overflow-hidden text-center">
          <div className="h-[3px] bg-gradient-to-r from-[var(--avd-warn)] to-[var(--avd-warn-600)]" />
          <div className="p-10">
            <div className="mx-auto mb-5 w-[72px] h-[72px] flex items-center justify-center rounded-full bg-[var(--avd-warn-bg)] border border-[color-mix(in_oklch,var(--avd-warn)_30%,transparent)] text-[var(--avd-warn)]">
              <Vote className="w-8 h-8" />
            </div>
            <span className="avd-chip avd-chip-warn mb-5 h-8 text-[13px]">{label}</span>
            <p className="text-[var(--avd-fg-muted)] text-[13px] font-medium mb-6 leading-relaxed">
              {activeRound.is_closed
                ? `La votación "${activeRound.title}" ha llegado a su fin y las urnas se han cerrado definitivamente.`
                : activeRound.round_finalized
                ? `La ronda ${activeRound.current_round_number} de "${activeRound.title}" terminó. No es posible enviar más papeletas en este momento.`
                : `La votación de "${activeRound.title}" se encuentra en pausa. Mantente a la espera de instrucciones.`
              }
            </p>
            {(activeRound.is_closed || activeRound.round_finalized) && (
              <div className="bg-[var(--avd-warn-bg)] border border-[color-mix(in_oklch,var(--avd-warn)_30%,transparent)] rounded-[var(--avd-radius-sm)] px-4 py-2.5 text-[13px] text-[var(--avd-warn-fg)] font-semibold flex items-center justify-center gap-2">
                <span>⏳</span> Las urnas ya no aceptan respuestas.
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
        <div className="absolute right-4 top-4 z-20"><HeaderControls mode="inline" /></div>
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
        <div aria-hidden="true" className="fixed inset-0 z-[150] pointer-events-none bg-background flex items-center justify-center flex-col gap-3">
          <span className="text-[40px]">🔒</span>
          <span className="text-base font-bold text-foreground">Votación privada</span>
          <span className="text-[13px] text-muted-foreground">Vuelve a esta pestaña para continuar</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-5 pt-4 text-center sm:mb-7">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--avd-fg-muted)] mb-1">{activeRound.voting_type_name || activeRound.team}</div>
          <h1 className="text-[clamp(20px,5vw,28px)] font-black tracking-[-0.025em] text-[var(--avd-fg)] m-0">{activeRound.title}</h1>
          {activeRound.description && (
            <p className="mt-1.5 text-[12.5px] text-[var(--avd-fg-muted)] max-w-xl mx-auto">{activeRound.description}</p>
          )}
          <div className="mt-1.5 text-[12.5px] text-[var(--avd-fg-muted)]">{candidates.length} candidatos · {activeRound.max_selected_candidates} a elegir</div>
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
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--avd-border)] bg-[var(--avd-surface)] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.18)] px-4 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))]">{/* env() safe-area used in pb */}
          <div className="mx-auto max-w-4xl space-y-2">
            <div className="min-w-0">
              {selectedCandidates.length > 0 ? (
                <p className="truncate text-sm font-semibold text-[var(--avd-fg)]">{selectedCandidateShortNames.join(' · ')}</p>
              ) : (
                <p className="text-sm text-[var(--avd-fg-faint)]">Selecciona candidatos o vota en blanco</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-[var(--avd-fg-muted)]">Ronda {activeRound.current_round_number} - Máx. {maxVotesThisRound} voto{maxVotesThisRound > 1 ? 's' : ''}</p>
              <div className="flex-1" />
              <button type="button" onClick={clearSelection} disabled={selectedCandidates.length === 0 || voting} aria-label="Borrar selección" className="avd-btn avd-btn-danger w-[42px] h-[42px] p-0">
                <Trash2 className="w-[18px] h-[18px]" />
              </button>
              <button type="button" onClick={openVoteConfirmation} disabled={maxVotesThisRound === 0 || voting} className="avd-btn h-[42px] bg-[var(--avd-ok)] text-white border-[var(--avd-ok)] font-bold px-[18px] shrink-0">
                {voting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 [animation-duration:0.7s]" />Votando...</>
                ) : selectedCandidates.length === 0 ? (
                  <><Vote className="w-[18px] h-[18px] mr-2" />Votar en blanco</>
                ) : (
                  <><Vote className="w-[18px] h-[18px] mr-2" />Votar ({selectedCandidates.length})</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmVoteOpen && (
        <div className="avd-dialog-overlay z-[110]" onMouseDown={(e) => { if (e.target === e.currentTarget && !voting) setConfirmVoteOpen(false); }}>
          <div className="avd-dialog max-w-[420px] p-0" onClick={(e) => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            <div className="px-8 pt-8 pb-5 text-center">
              <div className="mx-auto mb-5 w-16 h-16 flex items-center justify-center rounded-2xl bg-[#d1fae5] border border-[#6ee7b7]">
                <Vote className="w-8 h-8 text-[#059669]" strokeWidth={1.7} />
              </div>
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--avd-fg)] mb-2">Confirmar voto</h2>
              <p className="text-[13px] leading-relaxed text-[var(--avd-fg-muted)]">Revisa tu selección. Esta acción no se puede deshacer.</p>
            </div>
            <div className="px-6 pb-5">
              <div className="overflow-hidden rounded-[var(--avd-radius-md)] border border-[var(--avd-border)] bg-[var(--avd-bg-sunken)]">
                <div className="flex items-center gap-2 border-b border-[var(--avd-border-soft)] px-4 py-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--avd-fg-muted)]">Tu selección</p>
                </div>
                <div className="px-4 py-3 flex flex-col gap-2">
                  {selectedCandidateNames.length === 0 ? (
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--avd-fg-faint)] text-[10px] font-bold text-white">—</span>
                      <span className="text-[13px] font-semibold text-[var(--avd-fg-muted)] italic">Voto en blanco</span>
                    </div>
                  ) : selectedCandidateNames.map((name, index) => (
                    <div key={`${name}-${index}`} className="flex items-center gap-3">
                      <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--avd-brand-bg)] text-[10px] font-bold text-[var(--avd-brand)]">{index + 1}</span>
                      <span className="text-[13px] font-semibold text-[var(--avd-fg)]">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="avd-dialog-foot justify-stretch gap-2">
              <button disabled={voting} onClick={() => setConfirmVoteOpen(false)} className="avd-btn flex-1 justify-center h-11">Cancelar</button>
              <button disabled={voting} onClick={() => submitVote({ flushConfirmClose: () => flushSync(() => setConfirmVoteOpen(false)) })} className="avd-btn flex-1 justify-center h-11 bg-[var(--avd-ok)] text-white border-[var(--avd-ok)] font-bold">
                Confirmar voto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
