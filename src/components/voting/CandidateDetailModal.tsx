import { useEffect, useRef, useState, useCallback } from "react";
import { Cake, MapPin, Users, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, type PanInfo } from "framer-motion";
import { CandidateAvatar } from "@/components/voting/CandidateAvatar";
import type { CandidateRow } from "@/types/db";
import { formatCandidateName, isMonitor } from "@/lib/candidateFormat";
import { useAccessibility } from "@/contexts/AccessibilityContext";

type Candidate = CandidateRow;

interface Props {
  candidate: Candidate | null;
  onClose: () => void;
  initialZoom?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
}

const SWIPE_THRESHOLD = 55;
const SWIPE_VELOCITY_THRESHOLD = 300;

export function CandidateDetailModal({ candidate, onClose, initialZoom = false, onNext, onPrev }: Props) {
  const { visionPlus } = useAccessibility();
  const [imgFailed, setImgFailed] = useState(false);
  const [imgExpanded, setImgExpanded] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [questionsAtBottom, setQuestionsAtBottom] = useState(false);
  const [questionsOverflows, setQuestionsOverflows] = useState(false);

  const isNavigating = useRef(false);
  const navigatedRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pinchActive = useRef(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgFailed(false);
    setImgExpanded(initialZoom);
  }, [candidate?.id, initialZoom]);

  useEffect(() => {
    isNavigating.current = false;
    if (navigatedRef.current) {
      navigatedRef.current = false;
      setDragEnabled(true);
    } else {
      const t = setTimeout(() => setDragEnabled(true), 350);
      return () => clearTimeout(t);
    }
  }, [candidate?.id]);

  useEffect(() => {
    if (!candidate) { setDragEnabled(false); setImgExpanded(false); }
  }, [candidate]);

  useEffect(() => {
    const el = infoRef.current;
    if (!el) return;
    const check = () => {
      const overflows = el.scrollHeight > el.clientHeight + 2;
      setQuestionsOverflows(overflows);
      setQuestionsAtBottom(!overflows || Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 4);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [candidate?.id, imgExpanded]);

  const handleNext = useCallback(() => {
    if (!onNext || isNavigating.current) return;
    isNavigating.current = true;
    navigatedRef.current = true;
    setDragEnabled(false);
    setImgExpanded(false);
    onNext();
  }, [onNext]);

  const handlePrev = useCallback(() => {
    if (!onPrev || isNavigating.current) return;
    isNavigating.current = true;
    navigatedRef.current = true;
    setDragEnabled(false);
    setImgExpanded(false);
    onPrev();
  }, [onPrev]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const { offset, velocity } = info;
      if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD) handleNext();
      else if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) handlePrev();
    },
    [handleNext, handlePrev],
  );

  useEffect(() => {
    if (!candidate) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (imgExpanded) { setImgExpanded(false); return; }
        onClose();
      }
      if (!imgExpanded && e.key === "ArrowRight") handleNext();
      if (!imgExpanded && e.key === "ArrowLeft") handlePrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [candidate, onClose, handleNext, handlePrev, imgExpanded]);

  useEffect(() => {
    if (!candidate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [candidate]);

  if (!candidate) return null;

  const hasImage = !!candidate.image_url && !imgFailed;
  const hasNav = !!(onNext || onPrev);
  const hasQuestions = !!(candidate.asamblea_movimiento_es || candidate.asamblea_responsabilidad);
  const showScrollFade = questionsOverflows && !questionsAtBottom;

  return (
    <div
      ref={overlayRef}
      className="avd-dialog-overlay z-[200] flex flex-col items-center"
      onTouchStart={(e) => { if (e.touches.length >= 2) { pinchActive.current = true; } }}
      onTouchEnd={(e) => { if (e.touches.length === 0) pinchActive.current = false; }}
      onMouseDown={(e) => { if (e.target === overlayRef.current && !pinchActive.current) onClose(); }}
      onPointerDown={(e) => { if ((e.target as HTMLElement) === overlayRef.current && !pinchActive.current) onClose(); }}
    >
      <div
        className={`w-full max-w-[480px] flex-1 overflow-x-hidden overflow-y-auto flex flex-col justify-center px-4 pt-10 ${hasNav ? 'pb-28' : 'pb-10'}`}
        style={{ isolation: "isolate" }}
        onClick={(e) => { if (!pinchActive.current) onClose(); }}
      >
        <motion.div
          key={candidate.id}
          drag={!dragEnabled || imgExpanded ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          dragMomentum={false}
          dragDirectionLock
          dragTransition={{ bounceStiffness: 600, bounceDamping: 40 }}
          onDragEnd={handleDragEnd}
          whileDrag={{ cursor: "grabbing" }}
          className="avd-dialog max-w-full w-full p-0 overflow-hidden relative shadow-[0_20px_40px_-8px_rgba(0,0,0,0.22),0_8px_16px_-4px_rgba(0,0,0,0.1)]"
          style={{ cursor: imgExpanded ? "default" : "grab", touchAction: "pan-y" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-[var(--avd-fg-muted)] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
          >
            <X size={18} />
          </button>

          {/* Image — expands in place on tap */}
          <div
            className="relative bg-[var(--avd-bg-sunken)] shrink-0 overflow-hidden"
            style={{
              height: imgExpanded ? "min(65vh, 520px)" : "14rem",
              transition: "height 0.32s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <div className="h-full w-full overflow-hidden flex items-center justify-center">
              {hasImage ? (
                <img
                  src={candidate.image_url!}
                  alt={formatCandidateName(candidate)}
                  onError={() => setImgFailed(true)}
                  className="object-contain w-full h-full bg-transparent select-none"
                  style={{
                    touchAction: imgExpanded ? "pinch-zoom" : "manipulation",
                    cursor: imgExpanded ? "zoom-out" : "zoom-in",
                  }}
                  onClick={(e) => { e.stopPropagation(); setImgExpanded(v => !v); }}
                  draggable={false}
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

            {/* Tap hint — fades out when expanded */}
            {hasImage && (
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-white/70 bg-black/35 px-2.5 py-0.5 rounded-full pointer-events-none select-none transition-opacity duration-200"
                style={{ opacity: imgExpanded ? 0 : 1 }}
              >
                {visionPlus ? "Toca la imagen para ampliar" : "Toca para ampliar"}
              </div>
            )}

            {/* Collapse hint — visible when expanded */}
            {hasImage && imgExpanded && (
              <button
                onClick={(e) => { e.stopPropagation(); setImgExpanded(false); }}
                className="absolute top-2 left-2 text-[11px] text-white bg-black/50 px-2.5 py-1 rounded-full flex items-center gap-1 transition-opacity"
              >
                <X size={11} /> Cerrar
              </button>
            )}
          </div>

          {/* Info — stops drag propagation so scroll & pinch-zoom work */}
          <div className="flex-1 relative overflow-hidden flex flex-col">
            <div
              ref={infoRef}
              className="px-6 pt-5 pb-6 overflow-y-auto flex-1 overscroll-contain"
              style={{ touchAction: "pan-y pinch-zoom" }}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--avd-fg)] mb-3 leading-[1.2]">
                {formatCandidateName(candidate)}
              </h2>

              <div className="flex flex-wrap gap-[7px] mb-4">
                {candidate.location && (
                  <span className="avd-chip text-[14px] gap-1.5 py-[5px] px-3">
                    <MapPin size={13} /> {candidate.location}
                  </span>
                )}
                {candidate.group_name && (
                  <span className="avd-chip text-[14px] gap-1.5 py-[5px] px-3">
                    <Users size={13} /> {candidate.group_name}
                  </span>
                )}
                {candidate.age != null && (
                  <span className="avd-chip text-[14px] gap-1.5 py-[5px] px-3">
                    <Cake size={13} /> {candidate.age} años
                  </span>
                )}
                {isMonitor(candidate.crm_relationship_types) && (
                  <span
                    className="avd-chip avd-chip-brand text-[14px] font-bold py-[5px] px-3"
                    aria-label="Monitor"
                    title="Monitor"
                  >
                    M
                  </span>
                )}
              </div>

              {candidate.description && (
                <p className="text-[14px] text-[var(--avd-fg-muted)] leading-[1.6] m-0">
                  {candidate.description}
                </p>
              )}

              {hasQuestions && (
                <div className="mt-4 pt-4 border-t border-[var(--avd-border-soft)] flex flex-col gap-3">
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
                  {questionsOverflows && <div className="h-4 shrink-0" />}
                </div>
              )}

              {!candidate.description && !candidate.location && !candidate.group_name && !candidate.age && !hasQuestions && (
                <p className="text-[13px] text-[var(--avd-fg-faint)] m-0">
                  Sin información adicional disponible.
                </p>
              )}
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none transition-opacity duration-200"
              style={{
                background: "linear-gradient(to top, var(--avd-surface) 0%, transparent 100%)",
                opacity: showScrollFade ? 1 : 0,
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Nav */}
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
              Desliza la foto para navegar
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
