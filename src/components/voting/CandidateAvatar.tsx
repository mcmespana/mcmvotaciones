import { useState } from "react";
import { getInitials } from "@/lib/candidateFormat";

interface Props {
  name: string;
  surname: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  candidateId?: string;
}

const sizeMap = {
  sm: "w-10 h-10 text-sm",
  md: "w-16 h-16 text-lg",
  lg: "w-24 h-24 text-2xl",
  xl: "w-32 h-32 text-3xl",
};

// Official palette aligned with voting tutorial: red, emerald, yellow, blue
const PALETTE = [
  { bg: "#ef4444", text: "#fff" }, // red-500
  { bg: "#10b981", text: "#fff" }, // emerald-500
  { bg: "#eab308", text: "#fff" }, // yellow-500
  { bg: "#3b82f6", text: "#fff" }, // blue-500
];

function stableColorIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % PALETTE.length;
}

export function CandidateAvatar({ name, surname, imageUrl, size = "md", className = "", candidateId }: Props) {
  const [failed, setFailed] = useState(false);
  const sizeClass = sizeMap[size];

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={`${name} ${surname}`}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  const seed = candidateId || `${name}${surname}`;
  const color = PALETTE[stableColorIndex(seed)];

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 font-semibold ${className}`}
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {getInitials(name, surname)}
    </div>
  );
}
