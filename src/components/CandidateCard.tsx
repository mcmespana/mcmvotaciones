import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  group_name: string | null;
  age: number | null;
  description: string | null;
  image_url: string | null;
  order_index: number;
  is_eliminated: boolean;
  is_selected: boolean;
}

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

// 8 colores de pañuelo determinísticos
const BANDANA_COLORS = [
  { bg: "#E53E3E", light: "#FED7D7" }, // Rojo
  { bg: "#3B82F6", light: "#DBEAFE" }, // Azul
  { bg: "#10B981", light: "#D1FAE5" }, // Verde
  { bg: "#F97316", light: "#FFEDD5" }, // Naranja
  { bg: "#8B5CF6", light: "#EDE9FE" }, // Morado
  { bg: "#EC4899", light: "#FCE7F3" }, // Rosa
  { bg: "#06B6D4", light: "#CFFAFE" }, // Cyan
  { bg: "#EAB308", light: "#FEF9C3" }, // Amarillo
];

function getBandanaColor(name: string, surname: string) {
  const code = (name.charCodeAt(0) || 0) + (surname.charCodeAt(0) || 0);
  return BANDANA_COLORS[code % BANDANA_COLORS.length];
}

function getInitials(name: string, surname: string) {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
}

/** SVG avatar con pañuelo de color determinístico */
function AvatarFallback({ name, surname }: { name: string; surname: string }) {
  const color = getBandanaColor(name, surname);
  const initials = getInitials(name, surname);

  return (
    <div
      className="aspect-square w-full flex items-center justify-center rounded-full relative overflow-hidden"
      style={{ backgroundColor: color.light }}
    >
      {/* Silueta de persona */}
      <svg
        viewBox="0 0 120 120"
        className="w-3/4 h-3/4"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cabeza */}
        <circle cx="60" cy="38" r="22" fill={color.bg} opacity="0.25" />
        {/* Pañuelo */}
        <path
          d="M38 30 Q60 18 82 30 Q80 40 60 42 Q40 40 38 30Z"
          fill={color.bg}
        />
        {/* Nudo del pañuelo */}
        <circle cx="60" cy="42" r="3" fill={color.bg} opacity="0.8" />
        {/* Cuerpo */}
        <path
          d="M30 100 Q30 70 60 65 Q90 70 90 100"
          fill={color.bg}
          opacity="0.2"
        />
      </svg>
      {/* Iniciales superpuestas */}
      <div
        className="absolute inset-0 flex items-center justify-center text-3xl font-bold"
        style={{ color: color.bg }}
      >
        {initials}
      </div>
    </div>
  );
}

export function CandidateCard({
  candidate,
  isSelected,
  onToggle,
  disabled = false,
}: CandidateCardProps) {
  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden border border-outline-variant/55 bg-surface-container-lowest/95 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-glow",
        isSelected && [
          "border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-400 shadow-md shadow-indigo-600/30",
        ],
        disabled && "opacity-60 pointer-events-none"
      )}
      onClick={() => onToggle(candidate.id)}
    >
      {/* Checkmark overlay */}
      <div
        className={cn(
          "absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 md:right-3 md:top-3 md:h-10 md:w-10",
          isSelected
            ? "border-transparent bg-indigo-600 text-white opacity-100 scale-110 shadow-lg shadow-indigo-600/40"
            : "border-zinc-300 bg-white/80 dark:border-zinc-700 dark:bg-zinc-800/80 text-zinc-400 opacity-0 group-hover:opacity-100"
        )}
      >
        <Check className="h-4 w-4 md:h-5 md:w-5" strokeWidth={3} />
      </div>

      <CardHeader className="flex-row items-center gap-4 space-y-0 p-3 pr-11 pb-2.5 md:gap-3 md:p-4 md:pr-14 md:pb-3">
        {/* Imagen o avatar fallback */}
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-outline-variant/60 bg-surface-container-low md:h-20 md:w-20">
          {candidate.image_url ? (
            <>
              <img
                src={candidate.image_url}
                alt={`${candidate.name} ${candidate.surname}`}
                className={cn(
                  "h-full w-full object-cover transition-all duration-300",
                  isSelected && "brightness-105 contrast-105"
                )}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement | null;
                  if (fallback) {
                    fallback.classList.remove("hidden");
                    fallback.classList.add("flex");
                  }
                }}
              />
              <div className="hidden h-full w-full items-center justify-center">
                <AvatarFallback
                  name={candidate.name}
                  surname={candidate.surname}
                />
              </div>
            </>
          ) : (
            <AvatarFallback
              name={candidate.name}
              surname={candidate.surname}
            />
          )}
        </div>

        <div className="min-w-0 flex-1 pl-0.5 md:pl-0">
          <CardTitle className="font-headline text-[1.65rem] leading-tight md:text-2xl">
            {candidate.name} {candidate.surname}
          </CardTitle>

          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-muted-foreground md:mt-2">
            {candidate.age && <span className="rounded-full bg-surface-container-low px-2 py-0.5">Edad {candidate.age}</span>}
            {candidate.location && <span className="rounded-full bg-surface-container-low px-2 py-0.5">{candidate.location}</span>}
            {candidate.group_name && <span className="rounded-full bg-surface-container-low px-2 py-0.5">{candidate.group_name}</span>}
          </div>
        </div>
      </CardHeader>

      {candidate.description && (
        <CardContent className="px-3 pt-0 pb-3 md:px-4 md:pb-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {candidate.description}
          </p>
        </CardContent>
      )}

      {/* Selected indicator bar at bottom */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-2 rounded-b-[1.9rem] transition-all duration-300",
          isSelected ? "bg-indigo-600" : "bg-transparent"
        )}
      />
    </Card>
  );
}
