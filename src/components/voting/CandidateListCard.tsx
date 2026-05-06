import { Check, Info, MapPin } from "lucide-react";
import { useRef } from "react";
import { CandidateAvatar } from "@/components/voting/CandidateAvatar";
import { formatCandidateName } from "@/lib/candidateFormat";
import { cn } from "@/lib/utils";
import { CandidateRow } from "@/types/db";

interface CandidateListCardProps {
  candidate: CandidateRow;
  selected?: boolean;
  onClick?: () => void;
  onDetailView?: (candidate: CandidateRow) => void;
  onImageLongPress?: (candidate: CandidateRow) => void;
  hideCheckbox?: boolean;
}

const LONG_PRESS_MS = 500;

export function CandidateListCard({
  candidate,
  selected = false,
  onClick,
  onDetailView,
  onImageLongPress,
  hideCheckbox = false,
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
        "pub-cand-card relative outline-none select-none",
        onClick && "group cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500/35",
        selected && "!border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/25"
      )}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
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
      {!hideCheckbox && onClick && (
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
        className="shrink-0 leading-none"
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

      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-[var(--avd-fg)] tracking-[-0.01em] leading-[1.3]">
          {formatCandidateName(candidate)}
        </div>
        <div className="flex flex-wrap gap-1 mt-[5px]">
          {candidate.location && (
            <span className="avd-chip text-[11px] gap-[3px] max-w-full">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{candidate.location}</span>
            </span>
          )}
          {candidate.group_name && (
            <span className="avd-chip text-[11px] max-w-full">
              <span className="truncate">{candidate.group_name}</span>
            </span>
          )}
          {candidate.age != null && (
            <span className="avd-chip text-[11px] shrink-0">
              {candidate.age} a
            </span>
          )}
        </div>
        {candidate.description && (
          <p className="mt-1.5 text-xs text-[var(--avd-fg-muted)] leading-[1.5] line-clamp-3">
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
          className="absolute bottom-2 right-2 bg-transparent border-none cursor-pointer text-[var(--avd-fg-faint)] p-1 rounded-[6px] flex items-center opacity-60 hover:opacity-100 transition-opacity"
        >
          <Info size={14} />
        </button>
      )}
    </div>
  );
}
