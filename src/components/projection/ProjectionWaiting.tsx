import { useEffect, useState } from "react";
import { Clock, QrCode, Users } from "lucide-react";
import { Chip, InputOTP, Surface } from "@heroui/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        ? "primary"
        : "default";

  const connectionProgress = Math.min(connectedCount, 100);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-slate-900 dark:from-slate-950 dark:via-blue-950/40 dark:to-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-[-12%] top-[8%] h-[420px] w-[420px] rounded-full bg-cyan-500/25 blur-3xl dark:bg-cyan-500/15"
          style={{ animation: "float 8s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[-8%] right-[-8%] h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-3xl dark:bg-indigo-500/20"
          style={{ animation: "float 10s ease-in-out infinite reverse" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Surface className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_32px_70px_-35px_rgba(15,23,42,0.45)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Chip color={modeColor} variant="flat" className="font-semibold uppercase tracking-wide">
                {modeLabel}
              </Chip>
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-6xl">
              MCM Votaciones
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-700 dark:text-slate-300 sm:text-xl">
              {subtitle}
            </p>

            {accessCode && (
              <div className="mt-8">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300">
                  Codigo de acceso
                </p>
                <InputOTP.Root
                  value={accessCode}
                  readOnly
                  maxLength={accessCode.length}
                  className="w-fit"
                  inputClassName="opacity-0"
                >
                  <InputOTP.Group>
                    {accessCode.split("").map((char, index) => (
                      <InputOTP.Slot
                        key={`${char}-${index}`}
                        index={index}
                        className="h-14 w-12 rounded-2xl border border-cyan-300/70 bg-white/90 text-2xl font-black text-cyan-800 shadow-lg shadow-cyan-500/10 dark:border-cyan-400/30 dark:bg-slate-800/80 dark:text-cyan-200 sm:h-16 sm:w-14 sm:text-3xl"
                      />
                    ))}
                  </InputOTP.Group>
                </InputOTP.Root>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-300/70 bg-slate-100/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              <QrCode className="h-5 w-5" />
              <span className="truncate font-mono">{votingUrl}</span>
            </div>
          </Surface>

          <div className="grid gap-6">
            {showConnectedCount && (
              <Card className="overflow-hidden border-cyan-300/50 bg-white/85 text-slate-900 shadow-[0_25px_50px_-28px_rgba(8,145,178,0.6)] dark:border-cyan-400/20 dark:bg-slate-900/75 dark:text-white">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg">Conexiones activas</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="rounded-2xl border border-cyan-300/55 bg-cyan-500/10 p-4 dark:border-cyan-400/25 dark:bg-cyan-500/15">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">Conectadas ahora</p>
                        <p className="mt-1 text-5xl font-black tabular-nums leading-none">{connectedCount}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">personas en sala</p>
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-800 dark:text-cyan-100">
                        <Users className="h-7 w-7" />
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-cyan-100/90 dark:bg-cyan-950/55">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${connectionProgress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-300/70 bg-white/80 dark:border-slate-700 dark:bg-slate-900/75">
              <CardContent className="flex items-center justify-between pt-6">
                <div className="text-sm uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Hora local
                </div>
                <div className="flex items-center gap-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
                  <Clock className="h-6 w-6" />
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
