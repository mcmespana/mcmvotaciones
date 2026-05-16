import { useState, useEffect } from "react";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { VoteTicket } from "@/components/voting/VoteTicket";
import { SeatValidated } from "@/components/voting/SeatValidated";
import { VotingTutorial } from "@/components/voting/VotingTutorial";
import { VoteSubmitAnimation } from "@/components/voting/VoteSubmitAnimation";
import { ProjectionBallotAnimation } from "@/components/projection/ProjectionBallotAnimation";

const MOCK_RECEIPT = {
  roundId: "test-round",
  roundNumber: 1,
  voteCode: "VT-A3F2-9B17",
  votes: ["Ana García López", "María Rodríguez Vidal", "Lucía Jiménez Vicente"],
  createdAt: new Date().toISOString(),
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--avd-fg-muted)] m-0 pb-2 border-b border-[var(--avd-border)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FullscreenPreview({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999]" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
      <button
        className="fixed top-4 right-4 z-[1000] avd-btn avd-btn-sm"
        onClick={onClose}
      >
        Cerrar ✕
      </button>
    </div>
  );
}

const MOCK_BALLOTS = [
  { voteCode: "VT-AC4E-792B", roundNumber: 1, votes: ["Encarna Herrera", "Pilar Díaz", "Teresa Pérez"], isBlank: false },
  { voteCode: "VT-B3F1-881A", roundNumber: 1, votes: ["Carmen Rodríguez", "Ana García López", "Lucía Jiménez"], isBlank: false },
  { voteCode: "VT-C7D2-993E", roundNumber: 1, votes: ["María Sánchez Torres", "Pilar Díaz", "Encarna Herrera"], isBlank: false },
  { voteCode: "VT-D5E6-774F", roundNumber: 1, votes: [], isBlank: true },
  { voteCode: "VT-E1A9-556B", roundNumber: 1, votes: ["Ana García López", "Teresa Pérez", "Carmen Rodríguez"], isBlank: false },
  { voteCode: "VT-F2B8-447C", roundNumber: 1, votes: ["Pilar Díaz", "María Sánchez Torres", "Lucía Jiménez"], isBlank: false },
  { voteCode: "VT-G4C3-338D", roundNumber: 1, votes: ["Encarna Herrera", "Ana García López", "Teresa Pérez"], isBlank: false },
  { voteCode: "VT-H6D4-229E", roundNumber: 1, votes: ["Carmen Rodríguez", "Pilar Díaz", "María Sánchez Torres"], isBlank: false },
];

export function TestKitchen() {
  const [seatPreview, setSeatPreview] = useState<null | "normal" | "paused">(null);
  const [animVisible, setAnimVisible] = useState(false);
  const [tutorialKey, setTutorialKey] = useState(0);
  const [ballotAnimKey, setBallotAnimKey] = useState(0);
  const [ballotPreview, setBallotPreview] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  // Prevent VotingTutorial from auto-opening on mount (it opens for first-time viewers)
  useEffect(() => {
    try { localStorage.setItem("mcm_voting_tutorial_seen", "1"); } catch { /* ignore */ }
  }, []);

  function toggleDark() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);
  }

  return (
    <AccessibilityProvider>
      <div className="min-h-screen bg-[var(--avd-bg)] text-[var(--avd-fg)]">
        <div className="max-w-[860px] mx-auto px-6 py-10 flex flex-col gap-10">

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b-2 border-[var(--avd-border)]">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--avd-warn-bg)] text-[var(--avd-warn)] text-[13px] font-black">
              T
            </span>
            <div className="flex-1">
              <h1 className="m-0 text-[20px] font-black text-[var(--avd-fg)]">Test Kitchen</h1>
              <p className="m-0 text-[12px] text-[var(--avd-fg-muted)]">
                Solo visible en <code className="text-[var(--avd-brand)]">DEV</code> — previews de componentes voter
              </p>
            </div>
            <button
              className="avd-btn avd-btn-sm"
              onClick={toggleDark}
              title="Cambiar modo claro/oscuro"
            >
              {isDark ? "☀ Claro" : "☾ Oscuro"}
            </button>
          </div>

          {/* ── VoteTicket ── */}
          <Section title="VoteTicket — pantalla de confirmación">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1 flex flex-col gap-2">
                <p className="text-[12px] text-[var(--avd-fg-muted)] m-0 font-semibold">Con recibo</p>
                <div className="flex justify-center">
                  <VoteTicket
                    roundTitle="Votación MCM Europa 2026"
                    roundNumber={1}
                    voteHashCode={MOCK_RECEIPT.voteCode}
                    voteReceipt={MOCK_RECEIPT}
                    onCopy={() => {}}
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <p className="text-[12px] text-[var(--avd-fg-muted)] m-0 font-semibold">Sin recibo</p>
                <div className="flex justify-center">
                  <VoteTicket
                    roundTitle="Votación MCM Europa 2026"
                    roundNumber={2}
                    voteHashCode=""
                    voteReceipt={null}
                    onCopy={() => {}}
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ── SeatValidated ── */}
          <Section title="SeatValidated — asiento validado">
            <div className="flex gap-3 flex-wrap">
              <button
                className="avd-btn avd-btn-primary"
                onClick={() => setSeatPreview("normal")}
              >
                Ver: Sala Abierta
              </button>
              <button
                className="avd-btn avd-btn-warn"
                onClick={() => setSeatPreview("paused")}
              >
                Ver: Ronda en Pausa
              </button>
            </div>
            <p className="text-[12px] text-[var(--avd-fg-faint)] m-0">
              Se abre a pantalla completa. Pulsa fuera o "Cerrar" para volver.
            </p>
          </Section>

          {/* ── VotingTutorial ── */}
          <Section title="VotingTutorial — tutorial de votación">
            <div className="flex items-center gap-4">
              <button className="avd-btn avd-btn-primary" onClick={() => setTutorialKey(k => k + 1)}>
                Abrir tutorial
              </button>
              <VotingTutorial key={tutorialKey} forceOpen={tutorialKey > 0} roundId="test-kitchen" />
              <p className="text-[12px] text-[var(--avd-fg-muted)] m-0">
                Modal de pasos con animaciones y navegación.
              </p>
            </div>
          </Section>

          {/* ── ProjectionBallotAnimation ── */}
          <Section title="ProjectionBallotAnimation — revisión de papeletas">
            <div className="flex items-center gap-4">
              <button
                className="avd-btn avd-btn-primary"
                onClick={() => { setBallotAnimKey(k => k + 1); setBallotPreview(true); }}
              >
                Ver animación
              </button>
              <p className="text-[12px] text-[var(--avd-fg-muted)] m-0">
                Pantalla completa. La urna se abre y tiembla con cada papeleta.
              </p>
            </div>
          </Section>

          {/* ── VoteSubmitAnimation ── */}
          <Section title="VoteSubmitAnimation — animación de envío">
            <div className="flex items-center gap-4">
              <button
                className="avd-btn avd-btn-primary"
                onClick={() => setAnimVisible(true)}
                disabled={animVisible}
              >
                {animVisible ? "Ejecutando…" : "Lanzar animación"}
              </button>
              <p className="text-[12px] text-[var(--avd-fg-muted)] m-0">
                Superpone la animación completa de confirmación de voto.
              </p>
            </div>
          </Section>

        </div>
      </div>

      {/* ── Fullscreen overlays ── */}
      {seatPreview && (
        <FullscreenPreview onClose={() => setSeatPreview(null)}>
          <SeatValidated
            roundTitle="Votación MCM Europa 2026"
            isPaused={seatPreview === "paused"}
          />
        </FullscreenPreview>
      )}

      <VoteSubmitAnimation
        isVisible={animVisible}
        onComplete={() => setAnimVisible(false)}
        voteHash="VT-A3F2-9B17"
      />

      {ballotPreview && (
        <FullscreenPreview onClose={() => setBallotPreview(false)}>
          <ProjectionBallotAnimation
            key={ballotAnimKey}
            ballotSummaries={MOCK_BALLOTS}
            roundTitle="Votación MCM Europa 2026"
            roundNumber={1}
            team="ECE"
          />
        </FullscreenPreview>
      )}
    </AccessibilityProvider>
  );
}
