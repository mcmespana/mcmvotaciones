interface TeamChipProps {
  label: string;
}

export function TeamChip({ label }: TeamChipProps) {
  const isECE = label === "ECE";
  const isECL = label === "ECL";
  return (
    <span
      className={`avd-chip ${isECE ? "avd-chip-brand" : ""}`}
      style={isECL
        ? { background: "color-mix(in oklch, oklch(0.6 0.2 320) 12%, transparent)", color: "oklch(0.5 0.2 320)", borderColor: "color-mix(in oklch, oklch(0.6 0.2 320) 30%, transparent)" }
        : !isECE
        ? { background: "color-mix(in oklch, oklch(0.6 0.15 240) 12%, transparent)", color: "oklch(0.5 0.15 240)", borderColor: "color-mix(in oklch, oklch(0.6 0.15 240) 30%, transparent)" }
        : {}}
    >{label}</span>
  );
}
