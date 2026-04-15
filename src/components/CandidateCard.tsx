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
      className="aspect-square w-full flex items-center justify-center rounded-lg relative overflow-hidden"
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
        "cursor-pointer transition-all duration-200 relative group",
        "hover:shadow-md hover:border-primary/40",
        isSelected && [
          "ring-[3px] ring-primary/60 border-primary",
          "shadow-lg shadow-primary/10",
          "scale-[1.02]",
        ],
        disabled && "opacity-60 pointer-events-none"
      )}
      onClick={() => onToggle(candidate.id)}
    >
      {/* Checkmark overlay */}
      <div
        className={cn(
          "absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
          isSelected
            ? "bg-primary text-primary-foreground scale-100 opacity-100"
            : "bg-muted/80 text-muted-foreground scale-75 opacity-0 group-hover:opacity-60 group-hover:scale-90"
        )}
      >
        <Check className="w-5 h-5" strokeWidth={3} />
      </div>

      <CardHeader className="pb-3">
        {/* Imagen o avatar fallback */}
        <div className="aspect-square overflow-hidden rounded-lg mb-3">
          {candidate.image_url ? (
            <img
              src={candidate.image_url}
              alt={`${candidate.name} ${candidate.surname}`}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                isSelected && "brightness-105 contrast-105"
              )}
              loading="lazy"
              onError={(e) => {
                // Si la imagen falla, ocultar y mostrar fallback
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.nextSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : (
            <AvatarFallback
              name={candidate.name}
              surname={candidate.surname}
            />
          )}
        </div>

        <CardTitle className="text-lg leading-tight">
          {candidate.name} {candidate.surname}
        </CardTitle>

        <div className="space-y-1 text-sm text-muted-foreground mt-1">
          {candidate.age && <div>🎂 {candidate.age} años</div>}
          {candidate.location && <div>📍 {candidate.location}</div>}
          {candidate.group_name && <div>👥 {candidate.group_name}</div>}
        </div>
      </CardHeader>

      {candidate.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {candidate.description}
          </p>
        </CardContent>
      )}

      {/* Selected indicator bar at bottom */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 rounded-b-lg transition-all duration-300",
          isSelected ? "bg-primary" : "bg-transparent"
        )}
      />
    </Card>
  );
}
