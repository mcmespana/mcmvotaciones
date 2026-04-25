import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ProjectionWaitingMode } from "@/hooks/useProjectionData";

interface ProjectionWaitingProps {
  connectedCount: number;
  showConnectedCount: boolean;
  waitingMode: ProjectionWaitingMode;
  roundTitle: string | null;
  accessCode: string | null;
  votingUrl: string;
}

type ChipKind = "ok" | "warn" | "brand" | "muted";

function chip(kind: ChipKind): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "0 20px", height: 40, borderRadius: 9999,
    fontSize: 16, fontWeight: 700, letterSpacing: "-0.005em",
    whiteSpace: "nowrap", border: "1px solid",
    fontFamily: "var(--avd-font-sans)",
  };
  if (kind === "ok")    return { ...base, background: "var(--avd-ok-bg)",    color: "var(--avd-ok-fg)",         borderColor: "color-mix(in oklch, var(--avd-ok) 30%, transparent)" };
  if (kind === "warn")  return { ...base, background: "var(--avd-warn-bg)",  color: "var(--avd-warn-fg)",       borderColor: "color-mix(in oklch, var(--avd-warn) 32%, transparent)" };
  if (kind === "brand") return { ...base, background: "var(--avd-brand-bg)", color: "var(--avd-brand-subtle)",  borderColor: "var(--avd-brand-border)" };
  return                       { ...base, background: "var(--avd-bg-sunken)",color: "var(--avd-fg-muted)",     borderColor: "var(--avd-border-soft)" };
}

function card(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: "var(--avd-surface)",
    border: "1px solid var(--avd-border)",
    borderRadius: 16,
    position: "relative",
    overflow: "hidden",
    ...extra,
  };
}

function accentBar(color = "linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))"): React.ReactNode {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.9 }} />
  );
}

export function ProjectionWaiting({
  connectedCount,
  showConnectedCount,
  waitingMode,
  roundTitle,
  accessCode,
  votingUrl,
}: ProjectionWaitingProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const subtitle =
    waitingMode === "paused"
      ? "Votacion en pausa. Esperando reanudacion..."
      : waitingMode === "finalized"
      ? "Ronda finalizada. Esperando publicacion de resultados"
      : waitingMode === "room-open"
      ? `Sala ${roundTitle ? `"${roundTitle}" ` : ""}abierta. Esperando inicio de ronda`
      : "La votacion comenzara en breve";

  const modeLabel =
    waitingMode === "paused"     ? "Pausa activa"    :
    waitingMode === "finalized"  ? "Ronda cerrada"   :
    waitingMode === "room-open"  ? "Sala abierta"    : "Preparando sala";

  const modeKind: ChipKind =
    waitingMode === "paused"    ? "warn"  :
    waitingMode === "finalized" ? "ok"    :
    waitingMode === "room-open" ? "brand" : "muted";

  const shouldShowJoinQr = waitingMode === "paused" || waitingMode === "room-open" || waitingMode === "finalized";
  const normalizedCode = accessCode?.toUpperCase() ?? null;
  const hasAmbiguous = Boolean(normalizedCode?.includes("0")) || Boolean(normalizedCode?.includes("O"));

  return (
    <div style={{ minHeight: "100vh", background: "var(--avd-bg)", fontFamily: "var(--avd-font-sans)", color: "var(--avd-fg)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Ambient background orbs */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "color-mix(in oklch, var(--avd-brand) 5%, transparent)", filter: "blur(100px)", top: "-15%", left: "-10%", animation: "proj-orb-slow-a 25s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "color-mix(in oklch, var(--avd-brand) 4%, transparent)", filter: "blur(80px)", bottom: "-10%", right: "-5%", animation: "proj-orb-slow-b 30s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 32px", background: "var(--avd-bg-elev)", borderBottom: "1px solid var(--avd-border)", flexShrink: 0, position: "relative", zIndex: 1 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--avd-brand-400), var(--avd-brand-600))", display: "grid", placeItems: "center", color: "white", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>C</div>
        <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>VotacionesMCM</span>
        <div style={{ flex: 1 }} />
        <span style={chip(modeKind)}>{modeLabel}</span>
        <span style={{ fontFamily: "var(--avd-font-mono)", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--avd-fg-muted)" }}>
          {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", gap: 0, minHeight: 0, position: "relative", zIndex: 1 }}>
        {/* Left: main info */}
        <div style={{ padding: "48px 48px 48px 56px", display: "flex", flexDirection: "column", gap: 40, borderRight: "1px solid var(--avd-border)", overflow: "auto" }}>
          {/* Title block */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)", marginBottom: 16 }}>Sistema de votaciones</div>
            <h1 style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, margin: 0, background: "linear-gradient(120deg, var(--avd-fg) 20%, var(--avd-brand-400) 50%, var(--avd-fg) 80%)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "proj-title-shimmer 6s linear infinite" }}>MCM Votaciones</h1>
            <p style={{ fontSize: 26, color: "var(--avd-fg-muted)", fontWeight: 500, marginTop: 14, lineHeight: 1.4, maxWidth: "55ch" }}>{subtitle}</p>
          </div>

          {/* Access code */}
          {normalizedCode && (
            <div style={card({ padding: "32px 36px", animation: "proj-code-pulse 3s ease-in-out infinite" })}>
              {accentBar("linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))")}
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)", marginBottom: 20 }}>Código de acceso</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {normalizedCode.split("").map((char, index) => {
                  const isDigit = /[0-9]/.test(char);
                  const isZero = char === "0";
                  return (
                    <div
                      key={`${char}-${index}`}
                      style={{ width: 88, height: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--avd-bg)", border: "1px solid var(--avd-border-strong)", borderRadius: 10, animation: `card-enter 0.35s cubic-bezier(0.2,0.75,0.2,1) ${index * 0.07}s both` }}
                    >
                      {isZero ? (
                        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--avd-font-mono)", fontSize: 56, fontWeight: 800, color: "var(--avd-brand)" }}>
                          0
                          <span aria-hidden style={{ position: "absolute", width: 32, height: 3, background: "var(--avd-brand)", borderRadius: 2, transform: "rotate(-34deg)" }} />
                        </span>
                      ) : (
                        <span style={{ fontFamily: "var(--avd-font-mono)", fontSize: 56, fontWeight: 800, color: isDigit ? "var(--avd-brand)" : "var(--avd-fg)" }}>
                          {char}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {hasAmbiguous && (
                <p style={{ marginTop: 14, fontSize: 15, fontWeight: 600, color: "var(--avd-fg-muted)" }}>
                  Nota: el <span style={{ fontFamily: "var(--avd-font-mono)", color: "var(--avd-brand)" }}>0</span> (cero) se muestra con barra diagonal.
                </p>
              )}
            </div>
          )}

          {/* QR */}
          {shouldShowJoinQr && (
            <div style={card({ padding: "28px 32px" })}>
              {accentBar()}
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "center" }}>
                <div style={{ borderRadius: 12, border: "1px solid var(--avd-border)", background: "white", padding: 10 }}>
                  <QRCodeSVG value={votingUrl} size={140} bgColor="#ffffff" fgColor="#0f172a" level="M" includeMargin title="QR de ingreso" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)", marginBottom: 10 }}>Escanea para ingresar</div>
                  <p style={{ fontSize: 20, color: "var(--avd-fg-muted)", fontWeight: 500, marginBottom: 12, lineHeight: 1.4 }}>
                    Apunta la cámara de tu móvil para abrir la web de votación.
                  </p>
                  <div style={{ fontFamily: "var(--avd-font-mono)", fontSize: 14, fontWeight: 600, color: "var(--avd-fg)", background: "var(--avd-bg)", border: "1px solid var(--avd-border)", borderRadius: 6, padding: "6px 12px", display: "inline-block", maxWidth: "100%", wordBreak: "break-all" }}>
                    {votingUrl}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "var(--avd-bg-elev)" }}>
          {showConnectedCount && (
            <div style={{ padding: "32px 28px", borderBottom: "1px solid var(--avd-border)", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)" }}>Conexiones activas</div>
              <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1, color: "var(--avd-fg)", fontFamily: "var(--avd-font-sans)" }}>
                {connectedCount}
              </div>
              <div style={{ fontSize: 18, color: "var(--avd-fg-muted)", fontWeight: 500 }}>personas en sala</div>
              <div style={{ height: 6, borderRadius: 6, background: "var(--avd-border-soft)", overflow: "hidden", marginTop: 8 }}>
                <div style={{ height: "100%", width: `${Math.min(connectedCount, 100)}%`, background: "linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))", borderRadius: 6, transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}

          <div style={{ padding: "28px", borderBottom: "1px solid var(--avd-border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)", marginBottom: 8 }}>Estado</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={chip(modeKind)}>{modeLabel}</span>
            </div>
          </div>

          {roundTitle && (
            <div style={{ padding: "28px", borderBottom: "1px solid var(--avd-border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)", marginBottom: 8 }}>Ronda activa</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--avd-fg)", lineHeight: 1.3 }}>{roundTitle}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
