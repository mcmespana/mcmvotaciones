import { useEffect, useRef, useState } from "react";
import { MapPin, Users, X, ZoomIn, ZoomOut } from "lucide-react";
import { CandidateAvatar } from "@/components/voting/CandidateAvatar";
import { formatCandidateName } from "@/lib/candidateFormat";

interface Candidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  group_name: string | null;
  age: number | null;
  description: string | null;
  image_url: string | null;
}

interface Props {
  candidate: Candidate | null;
  onClose: () => void;
  initialZoom?: boolean;
}

const ZOOM_STEPS = [1, 1.5, 2];

export function CandidateDetailModal({ candidate, onClose, initialZoom = false }: Props) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setZoomIdx(initialZoom ? ZOOM_STEPS.length - 1 : 0);
    setImgFailed(false);
  }, [candidate?.id, initialZoom]);

  useEffect(() => {
    if (!candidate) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [candidate, onClose]);

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
      style={{ zIndex: 200, overflowY: "auto" }}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="avd-dialog"
        style={{ maxWidth: 480, padding: 0, overflow: "hidden", position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            background: "var(--avd-surface)", border: "1px solid var(--avd-border)",
            borderRadius: "50%", width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--avd-fg-muted)",
          }}
        >
          <X size={15} />
        </button>

        {/* Image section */}
        <div
          style={{
            background: "var(--avd-bg-sunken)",
            overflow: "hidden",
            height: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {hasImage ? (
            <img
              src={candidate.image_url!}
              alt={formatCandidateName(candidate)}
              onError={() => setImgFailed(true)}
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                transform: `scale(${zoom})`,
                transition: "transform 0.25s ease",
                cursor: zoom > 1 ? "zoom-out" : "zoom-in",
                touchAction: "pinch-zoom",
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
        <div style={{ padding: "24px 24px 28px" }}>
          <h2 style={{
            fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em",
            color: "var(--avd-fg)", marginBottom: 12, lineHeight: 1.2,
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

          {!candidate.description && !candidate.location && !candidate.group_name && !candidate.age && (
            <p style={{ fontSize: 13, color: "var(--avd-fg-faint)", margin: 0 }}>
              Sin información adicional disponible.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
