import { Cake, Check, Info, MapPin } from "lucide-react";
import { useRef } from "react";
import { CandidateAvatar } from "@/components/voting/CandidateAvatar";
import { formatCandidateName, isMonitor } from "@/lib/candidateFormat";
import { cn } from "@/lib/utils";
import { CandidateRow } from "@/types/db";
import { useAccessibility } from "@/contexts/AccessibilityContext";

interface CandidateListCardProps {
  candidate: CandidateRow;
  selected?: boolean;
  onClick?: () => void;
  onDetailView?: (candidate: CandidateRow) => void;
  onImageLongPress?: (candidate: CandidateRow) => void;
  hideCheckbox?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const LONG_PRESS_MS = 500;

export function CandidateListCard({
  candidate,
  selected = false,
  onClick,
  onDetailView,
  onImageLongPress,
  hideCheckbox = false,
  isFavorite = false,
  onToggleFavorite,
}: CandidateListCardProps) {
  const { visionPlus } = useAccessibility();
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

      {onToggleFavorite && (
        <button
          type="button"
          aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(candidate.id); }}
          className={cn(
            "absolute left-1.5 top-1.5 p-1.5 rounded-full border transition-all z-10",
            isFavorite
              ? "text-amber-400 border-amber-400/40 bg-amber-400/10 opacity-100"
              : "text-[var(--avd-fg-faint)] border-transparent bg-transparent opacity-0 group-hover:opacity-70 group-focus-within:opacity-70"
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
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
          className="h-14 w-14 text-base"
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
            <span
              className="avd-chip text-[11px] gap-[3px] shrink-0"
              aria-label={`${candidate.age} años`}
              title={`${candidate.age} años`}
            >
              <Cake className="w-2.5 h-2.5 shrink-0" />
              {candidate.age}
            </span>
          )}
          {isMonitor(candidate.crm_relationship_types) && (
            <span
              className="avd-chip avd-chip-brand text-[11px] font-bold shrink-0 px-[7px]"
              aria-label="Monitor"
              title="Monitor"
            >
              M
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
          className={`absolute bottom-2 right-2 bg-transparent border-none cursor-pointer text-[var(--avd-fg-faint)] ${visionPlus ? "p-3" : "p-1"} rounded-[6px] flex items-center opacity-60 hover:opacity-100 transition-opacity`}
        >
          <Info size={visionPlus ? 20 : 14} />
        </button>
      )}
    </div>
  );
}
