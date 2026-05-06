import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Users, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
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

const ZOOM_STEPS = [1, 1.5, 2];
const SWIPE_THRESHOLD = 52;
const EXIT_MS = 250;

export function CandidateDetailModal({ candidate, onClose, initialZoom = false, onNext, onPrev }: Props) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  // enterFrom drives the enter animation for the new card
  const [enterFrom, setEnterFrom] = useState<"left" | "right" | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Drag state stored in refs — avoids re-renders on every pixel
  const touchStartXRef = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const isAnimatingRef = useRef(false);

  // --- Helpers ---

  const applyDragTransform = (dx: number) => {
    const el = dialogRef.current;
    if (!el) return;
    const rot = dx * 0.035;
    const opacity = Math.max(0.55, 1 - Math.abs(dx) / 380);
    el.style.transition = "none";
    el.style.transform = `translateX(${dx}px) rotate(${rot}deg)`;
    el.style.opacity = String(opacity);
  };

  const snapBack = () => {
    const el = dialogRef.current;
    if (!el) return;
    el.style.transition = "transform 0.42s cubic-bezier(0.175, 0.885, 0.32, 1.4), opacity 0.25s ease-out";
    el.style.transform = "";
    el.style.opacity = "";
  };

  const resetTransform = () => {
    const el = dialogRef.current;
    if (!el) return;
    el.style.transition = "";
    el.style.transform = "";
    el.style.opacity = "";
  };

  const navigateWithAnimation = useCallback(
    (swipeDir: "left" | "right", callback: () => void) => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      const el = dialogRef.current;
      if (el) {
        const exitX = swipeDir === "left" ? -520 : 520;
        const rot = exitX * 0.025;
        el.style.transition = `transform ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.85, 0.85), opacity ${EXIT_MS}ms ease-in`;
        el.style.transform = `translateX(${exitX}px) rotate(${rot}deg)`;
        el.style.opacity = "0";
      }

      // Enter direction is opposite of swipe direction
      const enterDir: "left" | "right" = swipeDir === "left" ? "right" : "left";

      setTimeout(() => {
        setEnterFrom(enterDir);
        callback();
        // isAnimatingRef reset in the candidate-change effect
      }, EXIT_MS + 20);
    },
    [],
  );

  // Keyboard navigation
  const handleNext = useCallback(() => {
    if (onNext) navigateWithAnimation("left", onNext);
  }, [onNext, navigateWithAnimation]);

  const handlePrev = useCallback(() => {
    if (onPrev) navigateWithAnimation("right", onPrev);
  }, [onPrev, navigateWithAnimation]);

  // --- Touch handlers ---

  const onTouchStart = (e: React.TouchEvent) => {
    const isTouchOnImage = imageContainerRef.current?.contains(e.target as Node);
    if ((zoomIdx > 0 && isTouchOnImage) || isAnimatingRef.current) {
      touchStartXRef.current = null;
      return;
    }
    touchStartXRef.current = e.targetTouches[0].clientX;
    dragXRef.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || isAnimatingRef.current) return;
    const dx = e.targetTouches[0].clientX - touchStartXRef.current;
    dragXRef.current = dx;
    applyDragTransform(dx);
  };

  const onTouchEnd = () => {
    if (touchStartXRef.current === null || isAnimatingRef.current) return;
    const dx = dragXRef.current;
    touchStartXRef.current = null;
    dragXRef.current = 0;

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0 && onNext) {
        navigateWithAnimation("left", onNext);
      } else if (dx > 0 && onPrev) {
        navigateWithAnimation("right", onPrev);
      } else {
        snapBack();
      }
    } else {
      snapBack();
    }
  };

  // --- Effects ---

  // Reset on candidate change — runs BEFORE enterFrom effect (effects run in order)
  useEffect(() => {
    setZoomIdx(initialZoom ? ZOOM_STEPS.length - 1 : 0);
    setImgFailed(false);
    resetTransform();
    isAnimatingRef.current = false;
    touchStartXRef.current = null;
    dragXRef.current = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id, initialZoom]);

  // Reset touch state when zoom returns to 0 so swipe works immediately
  useEffect(() => {
    if (zoomIdx === 0) {
      touchStartXRef.current = null;
      dragXRef.current = 0;
    }
  }, [zoomIdx]);

  // Enter animation: set card off-screen, force reflow, then spring to center
  useEffect(() => {
    if (!enterFrom) return;
    const el = dialogRef.current;
    if (!el) return;

    const startX = enterFrom === "right" ? 140 : -140;

    // Position off-screen instantly (no transition)
    el.style.transition = "none";
    el.style.transform = `translateX(${startX}px)`;
    el.style.opacity = "0";

    // Force browser reflow so the initial position is painted
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight;

    // Spring into place
    el.style.transition = "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease-out";
    el.style.transform = "";
    el.style.opacity = "";

    const t = setTimeout(() => {
      resetTransform();
      setEnterFrom(null);
    }, 420);
    return () => clearTimeout(t);
  }, [enterFrom]);

  // Keyboard
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

  // Lock body scroll
  useEffect(() => {
    if (!candidate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [candidate]);

  if (!candidate) return null;

  const zoom = ZOOM_STEPS[zoomIdx];
  const hasImage = !!candidate.image_url && !imgFailed;

  return (
    <div
      ref={overlayRef}
      className="avd-dialog-overlay z-[200] overflow-y-auto flex flex-col items-center px-4 py-10"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="flex flex-col items-center w-full max-w-[480px] relative my-auto">
        <div
          ref={dialogRef}
          className="avd-dialog max-w-full w-full p-0 overflow-hidden relative shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] will-change-[transform,opacity] touch-pan-y"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-[var(--avd-fg-muted)] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
          >
            <X size={18} />
          </button>

          {/* Image section */}
          <div ref={imageContainerRef} className="relative h-60 bg-[var(--avd-bg-sunken)]">
            <div className={`overflow-auto h-full w-full flex relative ${zoom > 1 ? 'items-start justify-start' : 'items-center justify-center'}`}>
              {hasImage ? (
                <img
                  src={candidate.image_url!}
                  alt={formatCandidateName(candidate)}
                  onError={() => setImgFailed(true)}
                  className={`object-contain max-w-none min-w-full min-h-full bg-[#f8f9fa] transition-[width,height] duration-[0.25s] select-none ${zoom > 1 ? 'cursor-zoom-out touch-pan-x' : 'cursor-zoom-in touch-none'}`}
                  style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
                  onClick={() => setZoomIdx((i) => (i + 1) % ZOOM_STEPS.length)}
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

            {/* Zoom controls */}
            {hasImage && (
              <div className="absolute bottom-[10px] right-[10px] flex gap-1">
                <button
                  onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
                  disabled={zoomIdx === 0}
                  className={`bg-[rgba(0,0,0,0.55)] border-none rounded-[6px] w-[30px] h-[30px] text-white flex items-center justify-center cursor-pointer ${zoomIdx === 0 ? 'opacity-40' : 'opacity-100'}`}
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
                  disabled={zoomIdx === ZOOM_STEPS.length - 1}
                  className={`bg-[rgba(0,0,0,0.55)] border-none rounded-[6px] w-[30px] h-[30px] text-white flex items-center justify-center cursor-pointer ${zoomIdx === ZOOM_STEPS.length - 1 ? 'opacity-40' : 'opacity-100'}`}
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Info section */}
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
        </div>

        {/* Navigation footer */}
        {(onNext || onPrev) && (
          <div className="flex items-center justify-between w-full mt-6 px-2 gap-4">
            {onPrev ? (
              <button
                onClick={handlePrev}
                className="bg-white border-none rounded-full w-14 h-14 flex items-center justify-center cursor-pointer text-[#1a1a1a] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.2),0_4px_6px_-2px_rgba(0,0,0,0.1)] transition-transform duration-[0.2s] [transition-timing-function:cubic-bezier(0.175,0.885,0.32,1.275)] shrink-0"
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <ChevronLeft size={32} />
              </button>
            ) : <div className="w-14" />}

            <div className="flex-1 text-center text-white text-base font-semibold [text-shadow:0_2px_8px_rgba(0,0,0,0.5)] flex flex-col items-center gap-1">
              <span>💡 Desliza para ver el siguiente</span>
            </div>

            {onNext ? (
              <button
                onClick={handleNext}
                className="bg-white border-none rounded-full w-14 h-14 flex items-center justify-center cursor-pointer text-[#1a1a1a] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.2),0_4px_6px_-2px_rgba(0,0,0,0.1)] transition-transform duration-[0.2s] [transition-timing-function:cubic-bezier(0.175,0.885,0.32,1.275)] shrink-0"
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <ChevronRight size={32} />
              </button>
            ) : <div className="w-14" />}
          </div>
        )}
      </div>
    </div>
  );
}
