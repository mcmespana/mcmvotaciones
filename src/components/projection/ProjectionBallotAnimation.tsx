import { useEffect, useMemo, useRef, useState } from "react";
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
const PER_BALLOT_ENTRY_MS = 200;
const PER_BALLOT_HOLD_BASE_MS = 320; // names stagger within this window
const PER_BALLOT_DROP_MS = 260;
const PER_BALLOT_GAP_MS = 60; // pause between ballots

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
function UrnaSVG({ glow }: { glow: boolean }) {
  return (
    <svg
      viewBox="0 0 220 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="ballot-anim-urna-svg"
    >
      {/* Slot (ranura) */}
      <rect
        x="80" y="46" width="60" height="14" rx="7"
        fill="var(--avd-n-800)"
        stroke="var(--avd-n-600)"
        strokeWidth="1.5"
      />
      {/* Glow on slot when ballot enters */}
      {glow && (
        <rect
          x="80" y="46" width="60" height="14" rx="7"
          fill="none"
          stroke="var(--avd-brand)"
          strokeWidth="3"
          className="ballot-urna-slot-glow"
        />
      )}
      {/* Body */}
      <rect
        x="20" y="58" width="180" height="106" rx="10"
        fill="var(--avd-n-900)"
        stroke="var(--avd-n-600)"
        strokeWidth="1.5"
      />
      {/* Inner shadow line */}
      <line x1="20" y1="82" x2="200" y2="82" stroke="var(--avd-n-700)" strokeWidth="1" />
      {/* Lock icon */}
      <rect x="97" y="100" width="26" height="20" rx="4" fill="var(--avd-n-700)" />
      <path
        d="M103 100v-6a7 7 0 1114 0v6"
        stroke="var(--avd-n-600)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="110" cy="110" r="3" fill="var(--avd-n-500)" />
      {/* "URNA" label */}
      <text
        x="110" y="144"
        textAnchor="middle"
        fontFamily="var(--avd-font-mono)"
        fontSize="11"
        fontWeight="800"
        letterSpacing="3"
        fill="var(--avd-n-500)"
      >
        URNA
      </text>
      {/* Legs */}
      <rect x="52" y="162" width="14" height="6" rx="3" fill="var(--avd-n-700)" />
      <rect x="154" y="162" width="14" height="6" rx="3" fill="var(--avd-n-700)" />
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
  const [phase, setPhase] = useState<"entry" | "hold" | "drop" | "done">("entry");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        <div className="ballot-anim-stage">

          {/* Pila (shadow cards behind the active ballot) */}
          {!done && Array.from({ length: stackCount }).map((_, i) => (
            <div
              key={i}
              className="ballot-anim-stack-card"
              style={{
                transform: `translateY(${(stackCount - i) * -8}px) rotate(${(i % 2 === 0 ? 1 : -1) * (1.5 + i * 0.8)}deg) scale(${0.96 - i * 0.02})`,
                zIndex: stackCount - i,
                opacity: 0.4 - i * 0.1,
              }}
            />
          ))}

          {/* Active ballot */}
          <AnimatePresence mode="wait">
            {!done && current && (
              <motion.div
                key={`${index}-${current.voteCode}`}
                className="ballot-anim-card"
                style={{ zIndex: 10 }}
                initial={{ y: -140, rotate: 0, scale: 0.82, opacity: 0 }}
                animate={
                  phase === "entry"
                    ? { y: 0, rotate: (seed % 7) - 3, scale: 1, opacity: 1 }
                    : phase === "hold"
                    ? { y: 0, rotate: (seed % 7) - 3, scale: 1, opacity: 1 }
                    : { y: 200, rotate: 0, scale: 0.38, opacity: 0 }
                }
                transition={
                  phase === "drop"
                    ? { duration: PER_BALLOT_DROP_MS / 1000, ease: [0.4, 0, 0.6, 1] }
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
        <div className="ballot-anim-urna-wrap">
          <UrnaSVG glow={urnaGlow} />
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
