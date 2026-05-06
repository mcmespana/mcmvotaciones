import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Users, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useAnimation, type PanInfo } from "framer-motion";
import { CandidateAvatar } from "@/components/voting/CandidateAvatar";
import type { CandidateRow } from "@/types/db";
import { formatCandidateName } from "@/lib/candidateFormat";

type Candidate = CandidateRow;

interface Props {
  candidate: Candidate | null;
  onClose: () => void;
  initialZoom?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
}

const ZOOM_STEPS = [1, 2];
const SWIPE_THRESHOLD = 55;
const SWIPE_VELOCITY_THRESHOLD = 300;

// direction > 0 = going forward (next), < 0 = going back (prev)
const cardVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 280 : -280,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: {
      x: { type: "spring" as const, stiffness: 280, damping: 36 },
      opacity: { duration: 0.18 },
    },
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -320 : 320,
    opacity: 0,
    rotate: dir >= 0 ? -9 : 9,
    scale: 0.9,
    transition: {
      x: { type: "tween" as const, duration: 0.2, ease: [0.4, 0, 0.85, 0.85] },
      rotate: { type: "tween" as const, duration: 0.2 },
      scale: { type: "tween" as const, duration: 0.2 },
      opacity: { duration: 0.14 },
    },
  }),
};

export function CandidateDetailModal({ candidate, onClose, initialZoom = false, onNext, onPrev }: Props) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const [direction, setDirection] = useState(0);
  const controls = useAnimation();

  const overlayRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setZoomIdx(initialZoom ? ZOOM_STEPS.length - 1 : 0);
    setImgFailed(false);
  }, [candidate?.id, initialZoom]);

  // Animate to center on each new card; controls is stable across key changes
  useEffect(() => {
    void controls.start("center");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id]);

  const handleNext = useCallback(() => {
    if (!onNext) return;
    void controls.stop(); // freeze drag position so snap-back doesn't conflict with exit
    setDirection(1);
    Promise.resolve().then(onNext);
  }, [onNext, controls]);

  const handlePrev = useCallback(() => {
    if (!onPrev) return;
    void controls.stop();
    setDirection(-1);
    Promise.resolve().then(onPrev);
  }, [onPrev, controls]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const { offset, velocity } = info;
      if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
        handleNext();
      } else if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) {
        handlePrev();
      } else {
        // Not a nav swipe — spring back to center
        void controls.start({ x: 0, transition: { type: "spring", stiffness: 500, damping: 36 } });
      }
    },
    [handleNext, handlePrev, controls],
  );

  useEffect(() => {
    if (!candidate) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [candidate, onClose, handleNext, handlePrev]);

  useEffect(() => {
    if (!candidate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [candidate]);

  if (!candidate) return null;

  const zoom = ZOOM_STEPS[zoomIdx];
  const isZoomed = zoom > 1;
  const hasImage = !!candidate.image_url && !imgFailed;
  const hasNav = !!(onNext || onPrev);

  return (
    <div
      ref={overlayRef}
      className="avd-dialog-overlay z-[200] flex flex-col items-center"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Scrollable card area */}
      <div className={`w-full max-w-[480px] flex-1 overflow-x-hidden overflow-y-auto flex flex-col justify-center px-4 pt-10 ${hasNav ? 'pb-28' : 'pb-10'}`}>
        <AnimatePresence custom={direction} mode="popLayout">
          <motion.div
            key={candidate.id}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate={controls}
            exit="exit"
            drag={isZoomed ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            dragMomentum={false}
            dragTransition={{ bounceStiffness: 0, bounceDamping: 0 }}
            onDragEnd={handleDragEnd}
            whileDrag={{ cursor: "grabbing" }}
            className="avd-dialog max-w-full w-full p-0 overflow-hidden relative shadow-[0_20px_40px_-8px_rgba(0,0,0,0.22),0_8px_16px_-4px_rgba(0,0,0,0.1)]"
            style={{ willChange: "transform, opacity", cursor: isZoomed ? "default" : "grab" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-[var(--avd-fg-muted)] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
            >
              <X size={18} />
            </button>

            {/* Image */}
            <div ref={imageContainerRef} className="relative h-60 bg-[var(--avd-bg-sunken)]">
              <div className={`h-full w-full flex relative ${isZoomed ? 'overflow-auto touch-pan-x touch-pan-y items-start justify-start' : 'overflow-hidden touch-none items-center justify-center'}`}>
                {hasImage ? (
                  <img
                    src={candidate.image_url!}
                    alt={formatCandidateName(candidate)}
                    onError={() => setImgFailed(true)}
                    className={`object-contain max-w-none min-w-full min-h-full bg-[#f8f9fa] transition-[width,height] duration-[0.25s] select-none ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                    style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
                    onClick={() => setZoomIdx((i) => i === 0 ? 1 : 0)}
                  />
                ) : (
                  <CandidateAvatar
                    name={candidate.name}
                    surname={candidate.surname}
                    imageUrl={null}
                    candidateId={candidate.id}
                    size="xl"
                  />
                )}
              </div>

              {hasImage && (
                <button
                  onClick={() => setZoomIdx((i) => i === 0 ? 1 : 0)}
                  className="absolute bottom-[10px] right-[10px] bg-[rgba(0,0,0,0.55)] border-none rounded-[6px] w-[30px] h-[30px] text-white flex items-center justify-center cursor-pointer"
                  title={isZoomed ? "Reducir" : "Ampliar"}
                >
                  {isZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                </button>
              )}
            </div>

            {/* Info */}
            <div className="px-6 pt-6 pb-7 relative">
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--avd-fg)] mb-4 leading-[1.2]">
                {formatCandidateName(candidate)}
              </h2>

              <div className="flex flex-wrap gap-[6px] mb-4">
                {candidate.location && (
                  <span className="avd-chip text-[12px] gap-1">
                    <MapPin size={11} /> {candidate.location}
                  </span>
                )}
                {candidate.group_name && (
                  <span className="avd-chip text-[12px] gap-1">
                    <Users size={11} /> {candidate.group_name}
                  </span>
                )}
                {candidate.age != null && (
                  <span className="avd-chip text-[12px]">
                    {candidate.age} años
                  </span>
                )}
              </div>

              {candidate.description && (
                <p className="text-[14px] text-[var(--avd-fg-muted)] leading-[1.6] m-0">
                  {candidate.description}
                </p>
              )}

              {(candidate.asamblea_movimiento_es || candidate.asamblea_responsabilidad) && (
                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[var(--avd-border-soft)]">
                  {candidate.asamblea_movimiento_es && (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--avd-fg-subtle)] mb-[5px]">Para mí el MCM es…</div>
                      <p className="text-[13.5px] text-[var(--avd-fg-muted)] leading-[1.6] m-0">{candidate.asamblea_movimiento_es}</p>
                    </div>
                  )}
                  {candidate.asamblea_responsabilidad && (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--avd-fg-subtle)] mb-[5px]">Responsabilidades en el MCM</div>
                      <p className="text-[13.5px] text-[var(--avd-fg-muted)] leading-[1.6] m-0">{candidate.asamblea_responsabilidad}</p>
                    </div>
                  )}
                </div>
              )}

              {!candidate.description && !candidate.location && !candidate.group_name && !candidate.age && !candidate.asamblea_movimiento_es && !candidate.asamblea_responsabilidad && (
                <p className="text-[13px] text-[var(--avd-fg-faint)] m-0">
                  Sin información adicional disponible.
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav — fixed at bottom of overlay, never moves */}
      {hasNav && (
        <div className="fixed bottom-0 left-0 right-0 flex items-center justify-center px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-none z-[201]">
          <div className="flex items-center justify-between w-full max-w-[480px] pointer-events-auto">
            {onPrev ? (
              <motion.button
                onClick={handlePrev}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="bg-white border-none rounded-full w-14 h-14 flex items-center justify-center cursor-pointer text-[#1a1a1a] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.28),0_4px_6px_-2px_rgba(0,0,0,0.14)] shrink-0"
              >
                <ChevronLeft size={32} />
              </motion.button>
            ) : <div className="w-14" />}

            <p className="text-white text-[13px] font-semibold [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
              {isZoomed ? "Toca la foto para reducir" : "Desliza para navegar"}
            </p>

            {onNext ? (
              <motion.button
                onClick={handleNext}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="bg-white border-none rounded-full w-14 h-14 flex items-center justify-center cursor-pointer text-[#1a1a1a] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.28),0_4px_6px_-2px_rgba(0,0,0,0.14)] shrink-0"
              >
                <ChevronRight size={32} />
              </motion.button>
            ) : <div className="w-14" />}
          </div>
        </div>
      )}
    </div>
  );
}
