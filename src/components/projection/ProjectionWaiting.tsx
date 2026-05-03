import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ProjectionWaitingMode } from "@/hooks/useProjectionData";
import { Chip, AccentBar, SelectedCandidatesSidebar } from "./_shared";
import type { ChipKind } from "./_shared";

interface SelectedCandidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  selected_in_round: number | null;
  selected_vote_count: number | null;
}

interface ProjectionWaitingProps {
  connectedCount: number;
  showConnectedCount: boolean;
  waitingMode: ProjectionWaitingMode;
  roundTitle: string | null;
  accessCode: string | null;
  votingUrl: string;
  previouslySelected?: SelectedCandidate[];
}

export function ProjectionWaiting({
  connectedCount,
  showConnectedCount,
  waitingMode,
  roundTitle,
  accessCode,
  votingUrl,
  previouslySelected = [],
}: ProjectionWaitingProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const subtitle =
    waitingMode === "closed"
      ? "La votación ha finalizado. Gracias por participar."
      : waitingMode === "paused"
      ? "Votación en pausa. Esperando reanudación..."
      : waitingMode === "finalized"
      ? "Ronda finalizada. Esperando publicacion de resultados"
      : waitingMode === "room-open"
      ? `Sala ${roundTitle ? `"${roundTitle}" ` : ""}abierta. Esperando inicio de ronda`
      : "La votacion comenzara en breve";

  const modeLabel =
    waitingMode === "closed"     ? "Votación cerrada" :
    waitingMode === "paused"     ? "Pausa activa"     :
    waitingMode === "finalized"  ? "Ronda cerrada"    :
    waitingMode === "room-open"  ? "Sala abierta"     : "Preparando sala";

  const modeKind: ChipKind =
    waitingMode === "closed"    ? "ok"    :
    waitingMode === "paused"    ? "warn"  :
    waitingMode === "finalized" ? "ok"    :
    waitingMode === "room-open" ? "brand" : "muted";

  const shouldShowJoinQr = waitingMode === "paused" || waitingMode === "room-open" || waitingMode === "finalized";
  const normalizedCode = accessCode?.toUpperCase() ?? null;
  const hasAmbiguous = Boolean(normalizedCode?.includes("0")) || Boolean(normalizedCode?.includes("O"));

  return (
    <div className="proj-page">
      {/* Ambient background orbs */}
      <div className="proj-orb" style={{ width: 600, height: 600, background: "color-mix(in oklch, var(--avd-brand) 5%, transparent)", filter: "blur(100px)", top: "-15%", left: "-10%", animation: "proj-orb-slow-a 25s ease-in-out infinite" }} />
      <div className="proj-orb" style={{ width: 500, height: 500, background: "color-mix(in oklch, var(--avd-brand) 4%, transparent)", filter: "blur(80px)", bottom: "-10%", right: "-5%", animation: "proj-orb-slow-b 30s ease-in-out infinite" }} />

      {/* Topbar */}
      <div className="proj-topbar">
        <div className="proj-logo">C</div>
        <span className="proj-wordmark">VotacionesMCM</span>
        <div className="proj-spacer" />
        {normalizedCode && (
          <span className="proj-access-badge">{normalizedCode}</span>
        )}
        <Chip kind={modeKind} label={modeLabel} />
        <span className="proj-clock">
          {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      {/* Main */}
      <div className="proj-waiting-body">
        {/* Left: main info */}
        <div className="proj-waiting-left">
          {/* Title block */}
          <div>
            <div className="proj-overline" style={{ marginBottom: 16 }}>Sistema de votaciones</div>
            <h1 className="proj-waiting-title">MCM Votaciones</h1>
            <p className="proj-waiting-subtitle">{subtitle}</p>
          </div>

          {/* Access code */}
          {normalizedCode && shouldShowJoinQr && (
            <div className="avd-card" style={{ padding: "32px 36px", animation: "proj-code-pulse 3s ease-in-out infinite" }}>
              <AccentBar />
              <div className="proj-overline" style={{ marginBottom: 20 }}>Código de acceso</div>
              <div className="proj-code-chars">
                {normalizedCode.split("").map((char, index) => {
                  const isDigit = /[0-9]/.test(char);
                  const isZero = char === "0";
                  return (
                    <div
                      key={`${char}-${index}`}
                      className="proj-code-char"
                      style={{ animation: `card-enter 0.35s cubic-bezier(0.2,0.75,0.2,1) ${index * 0.07}s both` }}
                    >
                      {isZero ? (
                        <span className="proj-code-zero">
                          0
                          <span aria-hidden className="proj-code-zero-slash" />
                        </span>
                      ) : (
                        <span className={`proj-code-glyph${isDigit ? " proj-code-glyph--digit" : ""}`}>
                          {char}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {hasAmbiguous && (
                <p className="proj-code-note">
                  Nota: el <span style={{ fontFamily: "var(--avd-font-mono)", color: "var(--avd-brand)" }}>0</span> (cero) se muestra con barra diagonal.
                </p>
              )}
            </div>
          )}

          {/* QR */}
          {shouldShowJoinQr && (
            <div className="avd-card" style={{ padding: "28px 32px" }}>
              <AccentBar />
              <div className="proj-qr-grid">
                <div className="proj-qr-frame">
                  <QRCodeSVG value={votingUrl} size={140} bgColor="#ffffff" fgColor="#0f172a" level="M" includeMargin title="QR de ingreso" />
                </div>
                <div>
                  <div className="proj-qr-scan-title">Escanea para ingresar</div>
                  <p className="proj-qr-scan-desc">
                    Apunta la cámara de tu móvil para abrir la web de votación.
                  </p>
                  <span className="proj-qr-url">{votingUrl}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: stats */}
        <div className="proj-waiting-right">
          {showConnectedCount && (
            <div className="proj-stat-section">
              <div className="proj-stat-label">Conexiones activas</div>
              <div className="proj-stat-num">{connectedCount}</div>
              <div className="proj-stat-sub">personas en sala</div>
              <div className="proj-stat-progress">
                <div className="proj-stat-progress-fill" style={{ width: `${Math.min(connectedCount, 100)}%` }} />
              </div>
            </div>
          )}
          <SelectedCandidatesSidebar candidates={previouslySelected} />
        </div>
      </div>
    </div>
  );
}
