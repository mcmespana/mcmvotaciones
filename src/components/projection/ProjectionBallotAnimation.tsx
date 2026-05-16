import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import type { BallotSummary } from "@/hooks/useProjectionData";
import { PChip } from "./_shared";
import "./projection.css";

interface Props {
  ballotSummaries: BallotSummary[];
  roundTitle: string;
  roundNumber: number;
  team: string;
  /** ISO timestamp when the animation started — used to resume at the right ballot on reload. */
  startedAt?: string | null;
}

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rng = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function strToSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// ── Timing helpers ────────────────────────────────────────────────────────────
const PER_BALLOT_ENTRY_MS = 280;
const PER_BALLOT_HOLD_BASE_MS = 850; // names stagger within this window; total cycle ~1.67s
const PER_BALLOT_DROP_MS = 420;
const PER_BALLOT_GAP_MS = 120; // pause between ballots

function calcPerBallotMs(n: number) {
  return (
    PER_BALLOT_ENTRY_MS +
    PER_BALLOT_HOLD_BASE_MS +
    PER_BALLOT_DROP_MS +
    PER_BALLOT_GAP_MS +
    Math.max(0, Math.min(120, (30 - n) * 6)) // extra hold for small counts
  );
}

// ── Urna SVG ──────────────────────────────────────────────────────────────────
function UrnaSVG({ glow, lidOpen }: { glow: boolean; lidOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 220 185"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="ballot-anim-urna-svg"
    >
      {/* ── Lid group (opens at start, closes when done) ── */}
      <g className={`urna-lid-group${lidOpen ? " is-open" : ""}`}>
        {/* Lid body */}
        <rect x="14" y="44" width="192" height="24" rx="9"
          fill="var(--urna-surf)" stroke="var(--urna-bdr)" strokeWidth="1.5" />
        {/* Lid top highlight */}
        <rect x="16" y="46" width="188" height="5" rx="3"
          fill="var(--urna-shine)" />
        {/* Slot */}
        <rect x="80" y="51" width="60" height="12" rx="6"
          fill="var(--urna-slot)" stroke="var(--urna-mid)" strokeWidth="1" />
        {/* Slot glow */}
        {glow && (
          <rect x="80" y="51" width="60" height="12" rx="6"
            fill="none" stroke="var(--avd-brand)" strokeWidth="3"
            className="ballot-urna-slot-glow" />
        )}
        {/* Handle / knob */}
        <rect x="94" y="28" width="32" height="18" rx="9"
          fill="var(--urna-mid)" stroke="var(--urna-detail)" strokeWidth="1.5" />
        <rect x="100" y="32" width="20" height="6" rx="3"
          fill="var(--urna-shine)" />
      </g>

      {/* ── Body ── */}
      <rect x="20" y="66" width="180" height="98" rx="10"
        fill="var(--urna-body)" stroke="var(--urna-bdr)" strokeWidth="1.5" />
      {/* Top ridge */}
      <rect x="21" y="67" width="178" height="7" rx="0"
        fill="var(--urna-surf)" />
      {/* Corner bolts */}
      <circle cx="35" cy="82" r="3.5" fill="var(--urna-mid)" stroke="var(--urna-bdr)" strokeWidth="1" />
      <line x1="34" y1="82" x2="36" y2="82" stroke="var(--urna-detail)" strokeWidth="0.5" />
      <line x1="35" y1="81" x2="35" y2="83" stroke="var(--urna-detail)" strokeWidth="0.5" />
      <circle cx="185" cy="82" r="3.5" fill="var(--urna-mid)" stroke="var(--urna-bdr)" strokeWidth="1" />
      <line x1="184" y1="82" x2="186" y2="82" stroke="var(--urna-detail)" strokeWidth="0.5" />
      <line x1="185" y1="81" x2="185" y2="83" stroke="var(--urna-detail)" strokeWidth="0.5" />
      {/* Lock icon */}
      <rect x="97" y="102" width="26" height="20" rx="4" fill="var(--urna-mid)" />
      <path d="M103 102v-6a7 7 0 1114 0v6"
        stroke="var(--urna-bdr)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="110" cy="112" r="3" fill="var(--urna-detail)" />
      {/* "URNA" label */}
      <text x="110" y="148" textAnchor="middle"
        fontFamily="var(--avd-font-mono)" fontSize="11"
        fontWeight="800" letterSpacing="3" fill="var(--urna-detail)">
        URNA
      </text>
      {/* Legs */}
      <rect x="46" y="163" width="18" height="10" rx="5" fill="var(--urna-mid)" />
      <rect x="156" y="163" width="18" height="10" rx="5" fill="var(--urna-mid)" />
      <rect x="42" y="171" width="26" height="4" rx="2" fill="var(--urna-surf)" />
      <rect x="152" y="171" width="26" height="4" rx="2" fill="var(--urna-surf)" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProjectionBallotAnimation({
  ballotSummaries,
  roundTitle,
  roundNumber,
  team,
  startedAt,
}: Props) {
  // Stable seed from round title so all screens show the same order
  const seed = useMemo(() => strToSeed(roundTitle + roundNumber), [roundTitle, roundNumber]);
  const shuffled = useMemo(() => seededShuffle(ballotSummaries, seed), [ballotSummaries, seed]);

  const perBallotMs = useMemo(() => calcPerBallotMs(shuffled.length), [shuffled.length]);

  // If we're resuming (page reload), skip ahead to the right index
  const startIndex = useMemo(() => {
    if (!startedAt || shuffled.length === 0) return 0;
    const elapsed = Date.now() - new Date(startedAt).getTime();
    return Math.min(shuffled.length, Math.floor(elapsed / perBallotMs));
  }, [startedAt, shuffled.length, perBallotMs]);

  const [index, setIndex] = useState(startIndex);
  const [urnaGlow, setUrnaGlow] = useState(false);
  const [lidOpen, setLidOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [phase, setPhase] = useState<"entry" | "hold" | "drop" | "done">("entry");
  const [dropY, setDropY] = useState(280);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Measure stage height so the ballot's drop ends INSIDE the urna body (not below it).
  // Empirically 85% of stage height lands the card in the urna body region across viewports.
  useEffect(() => {
    const calc = () => {
      if (stageRef.current) setDropY(Math.round(stageRef.current.offsetHeight * 0.85));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // Open the lid shortly after mount so the first ballot has somewhere to land
  useEffect(() => {
    if (shuffled.length === 0) return;
    const t = setTimeout(() => setLidOpen(true), 250);
    return () => clearTimeout(t);
  }, [shuffled.length]);

  // Advance through the phases for each ballot
  useEffect(() => {
    if (index >= shuffled.length) return;

    const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

    setPhase("entry");

    const t1 = setTimeout(() => {
      setPhase("hold");
      const t2 = setTimeout(() => {
        setPhase("drop");
        const t3 = setTimeout(() => {
          // Trigger urna glow
          setUrnaGlow(true);
          const t4 = setTimeout(() => setUrnaGlow(false), 500);
          timerRef.current = t4;

          // Advance to next ballot after gap
          const t5 = setTimeout(() => {
            setIndex((i) => i + 1);
            setPhase("entry");
          }, PER_BALLOT_GAP_MS + 60);
          timerRef.current = t5;
        }, PER_BALLOT_DROP_MS);
        timerRef.current = t3;
      }, PER_BALLOT_HOLD_BASE_MS);
      timerRef.current = t2;
    }, PER_BALLOT_ENTRY_MS);
    timerRef.current = t1;

    return clear;
  }, [index, shuffled.length]);

  const done = index >= shuffled.length;
  const current = shuffled[index];
  const progress = Math.min(1, index / Math.max(1, shuffled.length));

  // End sequence: close lid → wait for it to close → trigger celebration + confetti
  useEffect(() => {
    if (!done || shuffled.length === 0) return;
    const closeLid = setTimeout(() => setLidOpen(false), 280);
    const startCelebrate = setTimeout(() => setCelebrate(true), 850);

    const fire = (opts: confetti.Options) => confetti({ disableForReducedMotion: true, ...opts });
    // Tutorial palette: red, emerald, yellow, blue
    const PALETTE = ["#ef4444", "#10b981", "#eab308", "#3b82f6"];
    const t1 = setTimeout(() => {
      fire({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.65 }, shapes: ["star"], colors: PALETTE, scalar: 1.2, startVelocity: 52, ticks: 260 });
      fire({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.65 }, shapes: ["star"], colors: PALETTE, scalar: 1.2, startVelocity: 52, ticks: 260 });
    }, 850);
    const t2 = setTimeout(() => {
      fire({ particleCount: 50, angle: 75, spread: 45, origin: { x: 0.15, y: 0.7 }, shapes: ["circle"], colors: PALETTE, scalar: 0.9, startVelocity: 38, gravity: 1.1 });
      fire({ particleCount: 50, angle: 105, spread: 45, origin: { x: 0.85, y: 0.7 }, shapes: ["circle"], colors: PALETTE, scalar: 0.9, startVelocity: 38, gravity: 1.1 });
    }, 1200);
    return () => {
      clearTimeout(closeLid);
      clearTimeout(startCelebrate);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [done, shuffled.length]);

  // Stack of "waiting" cards visible behind the active one
  const stackCount = Math.min(3, shuffled.length - index - 1);

  return (
    <div className="proj-page ballot-anim-page">
      {/* Ambient orbs */}
      <div className="proj-orb proj-orb-a" />
      <div className="proj-orb proj-orb-b" />
      <div className="proj-orb proj-orb-c" />

      {/* ── Header ── */}
      <header className="proj-header">
        <h1 className="proj-header-title proj-header-title--lg proj-header-title--flex">
          Revisión de papeletas
        </h1>
        <div className="proj-header-meta">
          <PChip color="blue">Ronda {roundNumber}</PChip>
          <PChip color="emerald">{team}</PChip>
          <PChip color="muted">{roundTitle}</PChip>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="ballot-anim-body">

        {/* ── Ballot stage ── */}
        <div className="ballot-anim-stage" ref={stageRef}>


          {/* Active ballot */}
          <AnimatePresence mode="wait">
            {!done && current && (
              <motion.div
                key={`${index}-${current.voteCode}`}
                className="ballot-anim-card"
                style={{ zIndex: 4 }}
                initial={{ y: -200, rotate: 0, scaleX: 0.82, scaleY: 0.82, opacity: 0 }}
                animate={
                  phase === "entry"
                    ? { y: 0, rotate: (seed % 7) - 3, scaleX: 1, scaleY: 1, opacity: 1 }
                    : phase === "hold"
                    ? { y: 0, rotate: (seed % 7) - 3, scaleX: 1, scaleY: 1, opacity: 1 }
                    : { y: dropY, rotate: 0, scaleX: 0.05, scaleY: 0.025, opacity: 1 }
                }
                transition={
                  phase === "drop"
                    ? {
                        y: { duration: PER_BALLOT_DROP_MS / 1000, ease: [0.3, 0, 0.8, 0.9] },
                        scaleX: { duration: PER_BALLOT_DROP_MS / 1000 * 0.65, ease: [0.5, 0, 1, 1] },
                        scaleY: { duration: PER_BALLOT_DROP_MS / 1000 * 0.8, ease: [0.5, 0, 1, 1] },
                        opacity: { duration: 0.05, delay: PER_BALLOT_DROP_MS / 1000 * 0.85 },
                      }
                    : { duration: PER_BALLOT_ENTRY_MS / 1000, ease: [0.2, 0.8, 0.2, 1] }
                }
              >
                {/* Card header */}
                <div className="ballot-anim-card-top">
                  <span className="ballot-anim-code">{current.voteCode}</span>
                  <span className="ballot-anim-round-chip">Ronda {current.roundNumber}</span>
                </div>
                <div className="ballot-anim-sep" />

                {/* Votes list */}
                {current.isBlank ? (
                  <div className="ballot-anim-blank">EN BLANCO</div>
                ) : (
                  <motion.ul
                    className="ballot-anim-list"
                    data-count={current.votes.length}
                    initial="hidden"
                    animate={phase === "hold" ? "visible" : "hidden"}
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
                  >
                    {(current.votes.length > 0 ? current.votes : ["-", "-", "-"]).map(
                      (name, ni) => (
                        <motion.li
                          key={ni}
                          className="ballot-anim-list-item"
                          variants={{
                            hidden: { opacity: 0.3, x: -6 },
                            visible: { opacity: 1, x: 0, transition: { duration: 0.18 } },
                          }}
                        >
                          <span className="ballot-anim-num">{ni + 1}</span>
                          <span className="ballot-anim-name">{name}</span>
                        </motion.li>
                      )
                    )}
                  </motion.ul>
                )}
              </motion.div>
            )}

            {/* Done state */}
            {done && (
              <motion.div
                key="done"
                className="ballot-anim-done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className="ballot-anim-done-icon">✓</div>
                <p className="ballot-anim-done-text">
                  {shuffled.length} papeleta{shuffled.length !== 1 ? "s" : ""} revisada{shuffled.length !== 1 ? "s" : ""}
                </p>
                <p className="ballot-anim-done-sub">Cargando resultados…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Urna ── */}
        <div className={`ballot-anim-urna-wrap${urnaGlow ? " is-shaking" : ""}${celebrate ? " is-done" : ""}`}>
          {urnaGlow && (
            <div className="urna-particles" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`urna-particle urna-p${i}`} />
              ))}
            </div>
          )}
          <UrnaSVG glow={urnaGlow} lidOpen={lidOpen} />
        </div>

        {/* ── Progress bar ── */}
        <div className="ballot-anim-progress-wrap">
          <div className="ballot-anim-progress-bar">
            <motion.div
              className="ballot-anim-progress-fill"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <span className="ballot-anim-progress-label">
            <strong>{Math.min(index, shuffled.length)}</strong> / {shuffled.length} papeletas
          </span>
        </div>
      </div>
    </div>
  );
}
