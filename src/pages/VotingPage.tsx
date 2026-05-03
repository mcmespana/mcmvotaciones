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
    id: 'preview-round', title: 'Preview Votacion', description: 'Vista local del ticket de voto',
    team: 'ECE', current_round_number: 2, max_votes_per_round: 3, max_selected_candidates: 6,
    selected_candidates_count: 3, is_active: true, is_closed: false, round_finalized: false,
    show_results_to_voters: false, show_ballot_summary_projection: false,
    access_code: null, is_voting_open: true, join_locked: false, votes_current_round: 0,
  } : null);

  const activeRound = previewMode === 'ticket' ? previewRound : activeRoundFromHook;

  if (previewMode) {
    const previewLinks = (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a className="avd-btn avd-btn-sm" href="/?preview=tutorial">tutorial</a>
        <a className="avd-btn avd-btn-sm" href="/?preview=anim">anim</a>
        <a className="avd-btn avd-btn-sm" href="/?preview=ticket">ticket</a>
        <a className="avd-btn avd-btn-sm" href="/">normal</a>
      </div>
    );

    if (previewMode === 'tutorial') {
      return (
        <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 560, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--avd-fg)' }}>Preview local: VotingTutorial</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--avd-fg-muted)' }}>
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
        <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 560, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--avd-fg)' }}>Preview local: VoteSubmitAnimation</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--avd-fg-muted)' }}>
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
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
        <div style={{ position: 'absolute', right: 16, top: 16, zIndex: 20 }}><ThemeToggle mode="inline" /></div>
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
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <Spinner size="md" className="mx-auto mb-4" />
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 14 }}>Cargando votación...</p>
        </div>
      </div>
    );
  }

  if (!isVotingAvailable()) {
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--avd-fg)' }}>Navegador no compatible</h1>
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 14 }}>
            Tu navegador no soporta las funciones necesarias para votar.
            Por favor, usa un navegador más reciente.
          </p>
        </div>
      </div>
    );
  }

  if (!activeRound) {
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: '100vh' }}>
        <ThemeToggle />
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: '40px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #ef4444, #22c55e, #eab308, #3b82f6)', backgroundSize: '200% auto', animation: 'shimmer-bar 3s linear infinite' }} />
          <div style={{ position: 'relative', margin: '0 auto 24px', width: 80, height: 80 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--avd-brand-bg)', border: '2px solid var(--avd-brand-border)', animation: 'pulse-ring 2s ease-in-out infinite' }} />
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--avd-brand-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--avd-brand)' }}>
              <Vote style={{ width: 36, height: 36 }} />
            </div>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: 'var(--avd-fg)', letterSpacing: '-0.01em' }}>Esperando siguiente votación…</h1>
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>No hay votaciones disponibles en este momento. La página se actualizará automáticamente.</p>
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
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <Spinner size="md" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 14 }}>Validando tu asiento...</p>
        </div>
      </div>
    );
  }

  if (seatError && !hasVoted) {
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--avd-fg)' }}>No se pudo acceder a la sala</h1>
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 14, marginBottom: 24 }}>{seatError}</p>
          <button className="avd-btn avd-btn-primary" onClick={() => { void loadActiveRound(); }} style={{ margin: '0 auto' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (maxVotesThisRound === 0 && !hasVoted && !activeRound.round_finalized && !activeRound.is_closed) {
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <div style={{ margin: '0 auto 20px', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--avd-ok-bg)', border: '1px solid color-mix(in oklch, var(--avd-ok) 30%, transparent)', color: 'var(--avd-ok)' }}>
            <Vote style={{ width: 32, height: 32 }} />
          </div>
          <span className="avd-chip avd-chip-ok" style={{ marginBottom: 20, height: 32, fontSize: 13 }}>Votación completada</span>
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 13, marginBottom: 6 }}>
            Ya se han seleccionado los {activeRound.max_selected_candidates} candidatos requeridos.
          </p>
          <p style={{ fontSize: 13, color: 'var(--avd-fg-faint)' }}>No se admitirán más votos en esta votación.</p>
        </div>
      </div>
    );
  }

  if (activeRound.is_active && !activeRound.is_voting_open && !activeRound.round_finalized && !activeRound.is_closed && !hasVoted) {
    const isPaused = activeRound.join_locked;
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}><ThemeToggle /></div>
        <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: isPaused ? 'color-mix(in oklch, var(--avd-warn) 8%, transparent)' : 'color-mix(in oklch, var(--avd-brand) 8%, transparent)', filter: 'blur(60px)', top: '10%', left: '-10%', animation: 'proj-orb-slow-a 18s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: isPaused ? 'color-mix(in oklch, var(--avd-warn) 6%, transparent)' : 'color-mix(in oklch, var(--avd-brand) 6%, transparent)', filter: 'blur(50px)', bottom: '5%', right: '-5%', animation: 'proj-orb-slow-b 22s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, overflow: 'hidden', textAlign: 'center', animation: 'card-enter 0.4s cubic-bezier(0.2,0.75,0.2,1) both', position: 'relative', zIndex: 1 }}>
          <div style={{ height: 3, background: isPaused ? 'linear-gradient(90deg, var(--avd-warn), var(--avd-warn-600))' : 'linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))' }} />
          <div style={{ padding: 40 }}>
            <div style={{ margin: '0 auto 20px', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isPaused ? 'var(--avd-warn-bg)' : 'var(--avd-brand-bg)', border: `1px solid ${isPaused ? 'color-mix(in oklch, var(--avd-warn) 30%, transparent)' : 'var(--avd-brand-border)'}`, color: isPaused ? 'var(--avd-warn)' : 'var(--avd-brand)', animation: 'breathe 3.5s ease-in-out infinite' }}>
              <Vote style={{ width: 32, height: 32 }} />
            </div>
            <span className={`avd-chip ${isPaused ? 'avd-chip-warn' : 'avd-chip-brand'}`} style={{ marginBottom: 20, height: 32, fontSize: 13 }}>
              {isPaused ? "Ronda en Pausa" : "Sala Abierta"}
            </span>
            <p style={{ color: 'var(--avd-fg-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 20, fontWeight: 500 }}>
              {isPaused
                ? `Sigues conectado con éxito a la sala "${activeRound.title}". Por favor, espera a que la administración reanude la sesión.`
                : `Has accedido a "${activeRound.title}". Todo está listo, solo espera a que el administrador dé luz verde para comenzar.`}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 20 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: isPaused ? 'var(--avd-warn)' : 'var(--avd-brand)', display: 'inline-block', animation: `dot-bounce 1.4s ease-in-out ${i * 0.22}s infinite` }} />
              ))}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--avd-ok-bg)', border: '1px solid color-mix(in oklch, var(--avd-ok) 30%, transparent)', borderRadius: 9999, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--avd-ok-fg)', cursor: 'default', userSelect: 'none', animation: 'ok-glow 3s ease-in-out infinite' }}>
              <ShieldCheck style={{ width: 13, height: 13, flexShrink: 0 }} />
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
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}><ThemeToggle /></div>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid color-mix(in oklch, var(--avd-warn) 35%, transparent)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-md)', width: '100%', maxWidth: 420, overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, var(--avd-warn), var(--avd-warn-600))' }} />
          <div style={{ padding: 40 }}>
            <div style={{ margin: '0 auto 20px', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--avd-warn-bg)', border: '1px solid color-mix(in oklch, var(--avd-warn) 30%, transparent)', color: 'var(--avd-warn)' }}>
              <Vote style={{ width: 32, height: 32 }} />
            </div>
            <span className="avd-chip avd-chip-warn" style={{ marginBottom: 20, height: 32, fontSize: 13 }}>{label}</span>
            <p style={{ color: 'var(--avd-fg-muted)', fontSize: 13, fontWeight: 500, marginBottom: 24, lineHeight: 1.6 }}>
              {activeRound.is_closed
                ? `La votación "${activeRound.title}" ha llegado a su fin y las urnas se han cerrado definitivamente.`
                : activeRound.round_finalized
                ? `La ronda ${activeRound.current_round_number} de "${activeRound.title}" terminó. No es posible enviar más papeletas en este momento.`
                : `La votación de "${activeRound.title}" se encuentra en pausa. Mantente a la espera de instrucciones.`
              }
            </p>
            {(activeRound.is_closed || activeRound.round_finalized) && (
              <div style={{ background: 'var(--avd-warn-bg)', border: '1px solid color-mix(in oklch, var(--avd-warn) 30%, transparent)', borderRadius: 'var(--avd-radius-sm)', padding: '10px 16px', fontSize: 13, color: 'var(--avd-warn-fg)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
      <div className="pub-page" style={{ padding: '16px 16px 64px' }}>
        <div style={{ maxWidth: 768, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))' }} />
            <div style={{ padding: '32px 32px 24px' }}>
              <div style={{ margin: '0 auto 20px', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--avd-brand-bg)', border: '1px solid var(--avd-brand-border)', color: 'var(--avd-brand)' }}>
                <Vote style={{ width: 28, height: 28 }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--avd-fg)', marginBottom: 8 }}>Resumen de Votación</h1>
              <p style={{ color: 'var(--avd-fg-muted)', fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Resultados finales — "{activeRound.title}"</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="avd-chip avd-chip-warn" style={{ height: 24, fontSize: 11 }}>🏆 {activeRound.team}</span>
                <span className="avd-chip avd-chip-brand" style={{ height: 24, fontSize: 11 }}>Ronda {activeRound.current_round_number}</span>
              </div>
            </div>
          </div>

          {candidates.some(c => c.is_selected) && (
            <div style={{ background: 'var(--avd-surface)', border: '1px solid color-mix(in oklch, var(--avd-ok) 35%, transparent)', borderRadius: 'var(--avd-radius-lg)', padding: 24 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: 'var(--avd-ok-fg)', marginBottom: 6 }}>
                <Trophy size={20} />Candidatos Seleccionados
              </h2>
              <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--avd-fg-muted)' }}>Mayoría absoluta (&gt;50% de los votos)</p>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {candidates.filter(c => c.is_selected).map((candidate) => (
                  <div key={candidate.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--avd-ok-bg)', border: '1px solid color-mix(in oklch, var(--avd-ok) 25%, transparent)', borderRadius: 'var(--avd-radius-md)', padding: 14 }}>
                    <div style={{ flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--avd-ok)', color: 'white', fontWeight: 700 }}>✓</div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--avd-ok-fg)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {candidate.name} {formatSurname(candidate.surname)}
                        {candidate.selected_in_round != null && (
                          <span className="avd-chip avd-chip-brand" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>R{candidate.selected_in_round}</span>
                        )}
                      </div>
                      {candidate.location && <div style={{ fontSize: 12, color: 'var(--avd-fg-muted)', marginTop: 2 }}>{candidate.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--avd-fg)' }}>
              <BarChart2 size={22} />Resultados de Ronda {activeRound.current_round_number}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--avd-fg-muted)', marginBottom: 20 }}>Votación finalizada</p>
            {loadingResults ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                <Spinner size="sm" />
              </div>
            ) : results.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--avd-fg-muted)', padding: '32px 0' }}>Aún no hay resultados disponibles.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map((result, index) => {
                  const candidate = candidates.find(c => c.id === result.candidate_id);
                  if (!candidate) return null;
                  const isSelected = candidate.is_selected;
                  const hasMajority = result.percentage > 50;
                  return (
                    <div key={result.candidate_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 'var(--avd-radius-md)', border: isSelected ? '1px solid color-mix(in oklch, var(--avd-ok) 40%, transparent)' : hasMajority ? '1px solid var(--avd-brand-border)' : '1px solid var(--avd-border)', background: isSelected ? 'var(--avd-ok-bg)' : hasMajority ? 'var(--avd-brand-bg)' : 'var(--avd-bg-sunken)' }}>
                      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, background: isSelected ? 'var(--avd-ok)' : 'var(--avd-brand-bg)', color: isSelected ? 'white' : 'var(--avd-brand)' }}>
                        {isSelected ? '✓' : index + 1}
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', color: 'var(--avd-fg)' }}>
                          {candidate.name} {formatSurname(candidate.surname)}
                          {isSelected && <span className="avd-chip avd-chip-ok" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>SELECCIONADO</span>}
                          {isSelected && candidate.selected_in_round != null && <span className="avd-chip avd-chip-brand" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>R{candidate.selected_in_round}</span>}
                          {hasMajority && !isSelected && <span className="avd-chip avd-chip-brand" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>+50%</span>}
                        </div>
                        {(candidate.location || candidate.group_name) && (
                          <div style={{ fontSize: 12, color: 'var(--avd-fg-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            {candidate.location && <><MapPin size={10} />{candidate.location}</>}
                            {candidate.location && candidate.group_name && <span> • </span>}
                            {candidate.group_name && <><Users size={10} />{candidate.group_name}</>}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <div style={{ flexGrow: 1, background: 'var(--avd-border-soft)', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 999, transition: 'width 1s ease', background: isSelected ? 'var(--avd-ok)' : 'var(--avd-brand)', width: `${Math.min(Math.max(result.percentage, 0), 100)}%` }} />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 56, textAlign: 'right', color: 'var(--avd-fg)' }}>{result.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--avd-fg)' }}>{result.vote_count}</div>
                        <div style={{ fontSize: 11, color: 'var(--avd-fg-muted)', textTransform: 'uppercase' }}>votos</div>
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
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
        <div style={{ position: 'absolute', right: 16, top: 16, zIndex: 20 }}><ThemeToggle mode="inline" /></div>
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
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 150, pointerEvents: 'none', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 40 }}>🔒</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Votación privada</span>
          <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Vuelve a esta pestaña para continuar</span>
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
              <button type="button" onClick={clearSelection} disabled={selectedCandidates.length === 0 || voting} aria-label="Borrar selección" className="avd-btn avd-btn-danger" style={{ width: 36, height: 36, padding: 0 }}>
                <Trash2 style={{ width: 15, height: 15 }} />
              </button>
              <button type="button" onClick={openVoteConfirmation} disabled={maxVotesThisRound === 0 || selectedCandidates.length === 0 || voting} className="avd-btn" style={{ height: 36, background: 'var(--avd-ok)', color: 'white', borderColor: 'var(--avd-ok)', fontWeight: 700, padding: '0 14px', flexShrink: 0 }}>
                {voting ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6 }} />Votando...</>
                ) : (
                  <><Vote style={{ width: 14, height: 14, marginRight: 6 }} />Votar ({selectedCandidates.length})</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmVoteOpen && (
        <div className="avd-dialog-overlay" style={{ zIndex: 110 }} onMouseDown={(e) => { if (e.target === e.currentTarget && !voting) setConfirmVoteOpen(false); }}>
          <div className="avd-dialog" style={{ maxWidth: 420, padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 4, background: 'linear-gradient(90deg,#10b981,#2dd4bf,#10b981)' }} />
            <div style={{ padding: '32px 32px 20px', textAlign: 'center' }}>
              <div style={{ margin: '0 auto 20px', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: '#d1fae5', border: '1px solid #6ee7b7' }}>
                <Vote style={{ width: 32, height: 32, color: '#059669' }} strokeWidth={1.7} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--avd-fg)', marginBottom: 8 }}>Confirmar voto</h2>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--avd-fg-muted)' }}>Revisa tu selección. Esta acción no se puede deshacer.</p>
            </div>
            <div style={{ padding: '0 24px 20px' }}>
              <div style={{ overflow: 'hidden', borderRadius: 'var(--avd-radius-md)', border: '1px solid var(--avd-border)', background: 'var(--avd-bg-sunken)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--avd-border-soft)', padding: '10px 16px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--avd-fg-muted)' }}>Tu selección</p>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedCandidateNames.map((name, index) => (
                    <div key={`${name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--avd-brand-bg)', fontSize: 10, fontWeight: 700, color: 'var(--avd-brand)' }}>{index + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--avd-fg)' }}>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="avd-dialog-foot" style={{ justifyContent: 'stretch', gap: 8 }}>
              <button disabled={voting} onClick={() => setConfirmVoteOpen(false)} className="avd-btn" style={{ flex: 1, justifyContent: 'center', height: 44 }}>Cancelar</button>
              <button disabled={voting} onClick={() => submitVote({ flushConfirmClose: () => flushSync(() => setConfirmVoteOpen(false)) })} className="avd-btn" style={{ flex: 1, justifyContent: 'center', height: 44, background: 'var(--avd-ok)', color: 'white', borderColor: 'var(--avd-ok)', fontWeight: 700 }}>
                Confirmar voto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
