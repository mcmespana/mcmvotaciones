import { useEffect, useState } from "react";
import { Clock, Users } from "lucide-react";
import { Chip, Surface } from "@heroui/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const subtitle = waitingMode === "paused"
    ? "Votacion en pausa. Esperando reanudacion..."
    : waitingMode === "finalized"
      ? "Ronda finalizada. Esperando publicacion de resultados"
    : waitingMode === "room-open"
      ? `Sala ${roundTitle ? `"${roundTitle}" ` : ""}abierta. Esperando inicio de ronda`
      : "La votacion comenzara en breve";

  const modeLabel = waitingMode === "paused"
    ? "Pausa activa"
    : waitingMode === "finalized"
      ? "Ronda cerrada"
      : waitingMode === "room-open"
        ? "Sala abierta"
        : "Preparando sala";

  const modeColor = waitingMode === "paused"
    ? "warning"
    : waitingMode === "finalized"
      ? "success"
      : waitingMode === "room-open"
        ? "accent"
        : "default";

  const connectionProgress = Math.min(connectedCount, 100);
  const shouldShowJoinQr =
    waitingMode === "paused" ||
    waitingMode === "room-open" ||
    waitingMode === "finalized";
  const normalizedAccessCode = accessCode?.toUpperCase() ?? null;
  const hasAmbiguousAccessCodeChars =
    Boolean(normalizedAccessCode?.includes("0")) ||
    Boolean(normalizedAccessCode?.includes("O"));

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-fixed/65 via-surface-container-lowest to-surface-container-low text-foreground dark:from-background dark:via-surface-container-low dark:to-background">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-[-12%] top-[8%] h-[420px] w-[420px] rounded-full bg-primary/22 blur-3xl dark:bg-primary/16"
          style={{ animation: "float 8s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[-8%] right-[-8%] h-[420px] w-[420px] rounded-full bg-primary-container/20 blur-3xl dark:bg-primary-container/22"
          style={{ animation: "float 10s ease-in-out infinite reverse" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full flex-col justify-center items-center px-8 py-12 lg:px-24">
        <div className="grid w-full gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
          <Surface className="rounded-[3rem] border-2 border-outline-variant/55 bg-surface-container-lowest/90 p-10 shadow-tech backdrop-blur-xl dark:border-outline-variant/65 dark:bg-surface-container-low/88 sm:p-14">
            <div className="flex flex-wrap items-center gap-4">
              <Chip color={modeColor} variant="soft" size="lg" className="text-xl font-bold uppercase tracking-wider px-6 py-6">
                {modeLabel}
              </Chip>
            </div>

            <h1 className="mt-10 text-6xl font-black tracking-tight text-foreground sm:text-8xl">
              MCM Votaciones
            </h1>
            <p className="mt-6 max-w-4xl text-3xl text-muted-foreground sm:text-4xl leading-relaxed">
              {subtitle}
            </p>

            {normalizedAccessCode && (
              <div className="mt-12">
                <p className="mb-6 text-2xl font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Código de acceso
                </p>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  {normalizedAccessCode.split("").map((char, index) => {
                    const isDigit = /[0-9]/.test(char);
                    const isZero = char === "0";

                    return (
                      <div
                        key={`${char}-${index}`}
                        className="flex h-24 w-20 items-center justify-center rounded-3xl border-2 border-outline-variant/60 bg-surface-container-lowest/92 shadow-tech dark:border-outline-variant/65 dark:bg-surface-container-low/88 sm:h-32 sm:w-28"
                        aria-label={`Caracter ${index + 1}: ${isZero ? "numero cero" : char}`}
                      >
                        {isZero ? (
                          <span className="relative inline-flex items-center justify-center font-mono text-6xl font-black text-primary sm:text-7xl">
                            0
                            <span
                              aria-hidden
                              className="pointer-events-none absolute h-[3px] w-8 rotate-[-34deg] rounded-full bg-primary/75 sm:w-10"
                            />
                          </span>
                        ) : (
                          <span
                            className={`font-mono text-6xl font-black sm:text-7xl ${
                              isDigit ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {char}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {hasAmbiguousAccessCodeChars && (
                  <p className="mt-5 text-base font-semibold text-muted-foreground">
                    Nota: el <span className="font-mono text-primary">0</span> (numero) se muestra con barra diagonal.
                  </p>
                )}
              </div>
            )}

            {shouldShowJoinQr && (
              <div className="mt-12 grid gap-6 rounded-3xl border-2 border-outline-variant/55 bg-surface-container-low px-6 py-6 text-muted-foreground dark:border-outline-variant/65 dark:bg-surface-container/80 sm:px-8 sm:py-8 lg:grid-cols-[auto_1fr] lg:items-center">
                <div className="mx-auto rounded-[1.6rem] border-2 border-outline-variant/60 bg-white p-3 shadow-md dark:border-outline-variant/65">
                  <QRCodeSVG
                    value={votingUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                    includeMargin
                    title="QR de ingreso a votaciones"
                  />
                </div>

                <div className="min-w-0 space-y-3 text-center lg:text-left">
                  <p className="text-xl font-bold uppercase tracking-[0.2em] text-foreground sm:text-2xl">
                    Escanea para ingresar
                  </p>
                  <p className="text-lg sm:text-xl">
                    Apunta la camara de tu movil para abrir la web de votacion.
                  </p>
                  <p className="truncate rounded-2xl border border-outline-variant/55 bg-surface-container-lowest/85 px-4 py-3 font-mono text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    {votingUrl}
                  </p>
                </div>
              </div>
            )}
          </Surface>

          <div className="grid gap-10">
            {showConnectedCount && (
              <Card className="overflow-hidden border-2 border-outline-variant/55 bg-surface-container-lowest/88 text-foreground shadow-tech dark:border-outline-variant/65 dark:bg-surface-container-low/82 rounded-[3rem]">
                <CardHeader className="pb-4 pt-10 px-10">
                  <CardTitle className="text-3xl font-bold">Conexiones activas</CardTitle>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                  <div className="rounded-[2.5rem] border-2 border-primary/35 bg-primary-fixed/65 p-10 dark:border-primary/40 dark:bg-primary-fixed/35">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <p className="text-xl uppercase tracking-[0.2em] font-bold text-primary">Conectadas ahora</p>
                        <p className="mt-4 text-8xl font-black tabular-nums leading-none">{connectedCount}</p>
                        <p className="mt-4 text-2xl text-muted-foreground font-medium">personas en sala</p>
                      </div>
                      <div className="flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-primary-fixed text-primary">
                        <Users className="h-16 w-16" />
                      </div>
                    </div>
                    <div className="mt-10 h-4 overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-gradient-primary transition-all duration-500"
                        style={{ width: `${connectionProgress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-2 border-outline-variant/55 bg-surface-container-lowest/88 dark:border-outline-variant/65 dark:bg-surface-container-low/82 rounded-[3rem]">
              <CardContent className="flex items-center justify-between py-10 px-10">
                <div className="text-2xl font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Hora local
                </div>
                <div className="flex items-center gap-4 text-6xl font-black tabular-nums text-foreground">
                  <Clock className="h-12 w-12 text-primary" />
                  {currentTime.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(10px) translateX(-15px); }
        }
      `}</style>
    </div>
  );
}
