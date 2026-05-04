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
      className="avd-dialog-overlay"
      style={{
        zIndex: 200,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 16px",
      }}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: 480,
          position: "relative",
          margin: "auto 0",
        }}
      >
        <div
          ref={dialogRef}
          className="avd-dialog"
          style={{
            maxWidth: "100%",
            width: "100%",
            padding: 0,
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            willChange: "transform, opacity",
            touchAction: "pan-y",
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 12, right: 12, zIndex: 10,
              background: "var(--avd-surface)", border: "1px solid var(--avd-border)",
              borderRadius: "50%", width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--avd-fg-muted)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <X size={18} />
          </button>

          {/* Image section */}
          <div ref={imageContainerRef} style={{ position: "relative", height: 240, background: "var(--avd-bg-sunken)" }}>
            <div
              style={{
                overflow: "auto",
                height: "100%",
                width: "100%",
                display: "flex",
                alignItems: zoom > 1 ? "flex-start" : "center",
                justifyContent: zoom > 1 ? "flex-start" : "center",
                position: "relative",
              }}
            >
              {hasImage ? (
                <img
                  src={candidate.image_url!}
                  alt={formatCandidateName(candidate)}
                  onError={() => setImgFailed(true)}
                  style={{
                    width: `${zoom * 100}%`, height: `${zoom * 100}%`, objectFit: "contain",
                    maxWidth: "none", minWidth: "100%", minHeight: "100%",
                    backgroundColor: "#f8f9fa",
                    transition: "width 0.25s, height 0.25s",
                    cursor: zoom > 1 ? "zoom-out" : "zoom-in",
                    touchAction: zoom > 1 ? "pan-x pan-y" : "none",
                    userSelect: "none",
                  }}
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
              <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 4 }}>
                <button
                  onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
                  disabled={zoomIdx === 0}
                  style={{
                    background: "rgba(0,0,0,0.55)", border: "none",
                    borderRadius: 6, width: 30, height: 30, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", opacity: zoomIdx === 0 ? 0.4 : 1,
                  }}
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
                  disabled={zoomIdx === ZOOM_STEPS.length - 1}
                  style={{
                    background: "rgba(0,0,0,0.55)", border: "none",
                    borderRadius: 6, width: 30, height: 30, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", opacity: zoomIdx === ZOOM_STEPS.length - 1 ? 0.4 : 1,
                  }}
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Info section */}
          <div style={{ padding: "24px 24px 28px", position: "relative" }}>
            <h2 style={{
              fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em",
              color: "var(--avd-fg)", marginBottom: 16, lineHeight: 1.2,
            }}>
              {formatCandidateName(candidate)}
            </h2>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {candidate.location && (
                <span className="avd-chip" style={{ fontSize: 12, gap: 4 }}>
                  <MapPin size={11} /> {candidate.location}
                </span>
              )}
              {candidate.group_name && (
                <span className="avd-chip" style={{ fontSize: 12, gap: 4 }}>
                  <Users size={11} /> {candidate.group_name}
                </span>
              )}
              {candidate.age != null && (
                <span className="avd-chip" style={{ fontSize: 12 }}>
                  {candidate.age} años
                </span>
              )}
            </div>

            {candidate.description && (
              <p style={{ fontSize: 14, color: "var(--avd-fg-muted)", lineHeight: 1.6, margin: 0 }}>
                {candidate.description}
              </p>
            )}

            {(candidate.asamblea_movimiento_es || candidate.asamblea_responsabilidad) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--avd-border-soft)" }}>
                {candidate.asamblea_movimiento_es && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--avd-fg-subtle)", marginBottom: 5 }}>Para mí el MCM es…</div>
                    <p style={{ fontSize: 13.5, color: "var(--avd-fg-muted)", lineHeight: 1.6, margin: 0 }}>{candidate.asamblea_movimiento_es}</p>
                  </div>
                )}
                {candidate.asamblea_responsabilidad && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--avd-fg-subtle)", marginBottom: 5 }}>Responsabilidades en el MCM</div>
                    <p style={{ fontSize: 13.5, color: "var(--avd-fg-muted)", lineHeight: 1.6, margin: 0 }}>{candidate.asamblea_responsabilidad}</p>
                  </div>
                )}
              </div>
            )}

            {!candidate.description && !candidate.location && !candidate.group_name && !candidate.age && !candidate.asamblea_movimiento_es && !candidate.asamblea_responsabilidad && (
              <p style={{ fontSize: 13, color: "var(--avd-fg-faint)", margin: 0 }}>
                Sin información adicional disponible.
              </p>
            )}
          </div>
        </div>

        {/* Navigation footer */}
        {(onNext || onPrev) && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginTop: 24,
            padding: "0 8px",
            gap: 16,
          }}>
            {onPrev ? (
              <button
                onClick={handlePrev}
                style={{
                  background: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: 56, height: 56,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#1a1a1a",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -2px rgba(0,0,0,0.1)",
                  transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  flexShrink: 0,
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <ChevronLeft size={32} />
              </button>
            ) : <div style={{ width: 56 }} />}

            <div style={{
              flex: 1, textAlign: "center", color: "white",
              fontSize: 16, fontWeight: 600,
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <span>💡 Desliza para ver el siguiente</span>
            </div>

            {onNext ? (
              <button
                onClick={handleNext}
                style={{
                  background: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: 56, height: 56,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#1a1a1a",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -2px rgba(0,0,0,0.1)",
                  transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  flexShrink: 0,
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <ChevronRight size={32} />
              </button>
            ) : <div style={{ width: 56 }} />}
          </div>
        )}
      </div>
    </div>
  );
}
