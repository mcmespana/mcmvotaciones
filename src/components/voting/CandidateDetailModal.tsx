import { useEffect, useRef, useState } from "react";
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

export function CandidateDetailModal({ candidate, onClose, initialZoom = false, onNext, onPrev }: Props) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    if (zoomIdx > 0) return; // Prevent swipe navigation when zoomed in
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && onNext) onNext();
    if (isRightSwipe && onPrev) onPrev();
  };

  useEffect(() => {
    setZoomIdx(initialZoom ? ZOOM_STEPS.length - 1 : 0);
    setImgFailed(false);
  }, [candidate?.id, initialZoom]);

  useEffect(() => {
    if (!candidate) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && onNext) onNext();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [candidate, onClose, onNext, onPrev]);

  // Lock body scroll while open
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
        padding: "40px 16px"
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
          margin: "auto 0"
        }}
      >
        <div
          className="avd-dialog"
          style={{ 
            maxWidth: "100%", 
            width: "100%",
            padding: 0, 
            overflow: "hidden", 
            position: "relative",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndHandler}
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
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}
          >
            <X size={18} />
          </button>
  
          {/* Image section */}
          <div style={{ position: "relative", height: 240, background: "var(--avd-bg-sunken)" }}>
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
                    touchAction: "pan-x pan-y",
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
  
            {/* Zoom controls — only when image available */}
            {hasImage && (
              <div
                style={{
                  position: "absolute", bottom: 10, right: 10,
                  display: "flex", gap: 4,
                }}
              >
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
              <p style={{
                fontSize: 14, color: "var(--avd-fg-muted)",
                lineHeight: 1.6, margin: 0,
              }}>
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

        {/* External Navigation Footer */}
        {(onNext || onPrev) && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginTop: 24,
            padding: "0 8px",
            gap: 16
          }}>
            {onPrev ? (
              <button 
                onClick={onPrev} 
                style={{
                  background: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: 56,
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#1a1a1a",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  flexShrink: 0
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
              flex: 1, 
              textAlign: "center", 
              color: "white", 
              fontSize: 16, 
              fontWeight: 600,
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4
            }}>
              <span style={{ opacity: 1 }}>💡 Desliza para ver el siguiente</span>
            </div>

            {onNext ? (
              <button 
                onClick={onNext} 
                style={{
                  background: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: 56,
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#1a1a1a",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  flexShrink: 0
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
