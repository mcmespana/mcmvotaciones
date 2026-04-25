import { Check, Info, MapPin } from "lucide-react";
import { useRef } from "react";
import { CandidateAvatar } from "@/components/voting/CandidateAvatar";
import { formatCandidateName } from "@/lib/candidateFormat";
import { cn } from "@/lib/utils";

interface CandidateBase {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  group_name: string | null;
  age: number | null;
  description: string | null;
  image_url: string | null;
}

interface CandidateListCardProps {
  candidate: CandidateBase;
  selected?: boolean;
  onClick?: () => void;
  onDetailView?: (candidate: CandidateBase) => void;
  onImageLongPress?: (candidate: CandidateBase) => void;
}

const LONG_PRESS_MS = 500;

export function CandidateListCard({
  candidate,
  selected = false,
  onClick,
  onDetailView,
  onImageLongPress,
}: CandidateListCardProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const startPress = () => {
    if (!onDetailView) return;
    didLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onDetailView(candidate);
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (didLongPress.current) return;
    onClick?.();
  };

  const startImgPress = (e: React.TouchEvent | React.MouseEvent) => {
    if (!onImageLongPress) return;
    e.stopPropagation(); // prevent card's long-press timer
    cancelPress();       // cancel card timer if somehow started
    imgPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onImageLongPress(candidate);
    }, LONG_PRESS_MS);
  };

  const cancelImgPress = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (imgPressTimer.current) { clearTimeout(imgPressTimer.current); imgPressTimer.current = null; }
  };

  return (
    <div
      className={cn(
        "pub-cand-card relative outline-none",
        onClick && "group cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500/35",
        selected && "!border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/25"
      )}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ WebkitTapHighlightColor: "transparent" }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {onClick && (
        <span
          className={cn(
            "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
            selected
              ? "border-emerald-700 bg-emerald-600 text-white shadow-md"
              : "border-outline-variant bg-surface-container-lowest text-muted-foreground opacity-0 group-hover:opacity-100"
          )}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}

      <div
        style={{ flexShrink: 0, lineHeight: 0 }}
        onTouchStart={onImageLongPress ? startImgPress : undefined}
        onTouchEnd={onImageLongPress ? cancelImgPress : undefined}
        onTouchMove={onImageLongPress ? cancelImgPress : undefined}
        onMouseDown={onImageLongPress ? startImgPress : undefined}
        onMouseUp={onImageLongPress ? cancelImgPress : undefined}
        onMouseLeave={onImageLongPress ? cancelImgPress : undefined}
      >
        <CandidateAvatar
          name={candidate.name}
          surname={candidate.surname}
          imageUrl={candidate.image_url}
          candidateId={candidate.id}
          size="md"
          className="h-14 w-14 border border-outline-variant text-base"
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--avd-fg)", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
          {formatCandidateName(candidate)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
          {candidate.location && (
            <span className="avd-chip" style={{ fontSize: 11, gap: 3 }}>
              <MapPin style={{ width: 10, height: 10 }} />
              {candidate.location}
            </span>
          )}
          {candidate.group_name && (
            <span className="avd-chip" style={{ fontSize: 11 }}>{candidate.group_name}</span>
          )}
          {candidate.age != null && (
            <span className="avd-chip" style={{ fontSize: 11 }}>{candidate.age} a</span>
          )}
        </div>
        {candidate.description && (
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "var(--avd-fg-muted)",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {candidate.description}
          </p>
        )}
      </div>

      {/* Info button — opens detail modal */}
      {onDetailView && (
        <button
          type="button"
          aria-label="Ver detalles"
          onClick={(e) => { e.stopPropagation(); onDetailView(candidate); }}
          style={{
            position: "absolute", bottom: 8, right: 8,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--avd-fg-faint)", padding: 4, borderRadius: 6,
            display: "flex", alignItems: "center",
            opacity: 0.6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
        >
          <Info size={14} />
        </button>
      )}
    </div>
  );
}
