import { useState } from "react";
import { getInitials } from "@/lib/candidateFormat";

interface Props {
  name: string;
  surname: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "w-10 h-10 text-sm",
  md: "w-16 h-16 text-lg",
  lg: "w-24 h-24 text-2xl",
  xl: "w-32 h-32 text-3xl",
};

export function CandidateAvatar({ name, surname, imageUrl, size = "md", className = "" }: Props) {
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

  return (
    <div
      className={`${sizeClass} rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 font-semibold text-slate-600 ${className}`}
    >
      {getInitials(name, surname)}
    </div>
  );
}
