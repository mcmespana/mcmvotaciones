import { useEffect, useState } from "react";
import { Users, Clock, QrCode } from "lucide-react";
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
  const [pulseCount, setPulseCount] = useState(0);

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

  useEffect(() => {
    const pulse = setInterval(
      () => setPulseCount((n) => n + 1),
      3000
    );
    return () => clearInterval(pulse);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl"
          style={{
            top: "20%",
            left: "10%",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl"
          style={{
            bottom: "10%",
            right: "15%",
            animation: "float 12s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto px-8">
        {/* Logo / Title */}
        <div className="mb-12">
          <h1 className="text-7xl font-bold bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent mb-4">
            MCM Votaciones
          </h1>
          <p className="text-xl text-white/50">
            {subtitle}
          </p>
        </div>

        {/* Connected users counter (shown only while room is open) */}
        {showConnectedCount && (
          <div className="flex items-center justify-center gap-3 mb-12">
            <div
              className={`bg-white/5 border border-white/10 rounded-2xl px-8 py-6 backdrop-blur-sm transition-transform duration-500 ${
                pulseCount % 2 === 0 ? "scale-100" : "scale-[1.02]"
              }`}
            >
              <Users className="w-10 h-10 mx-auto mb-2 text-primary" />
              <div className="text-6xl font-bold tabular-nums">
                {connectedCount}
              </div>
              <div className="text-sm text-white/50 mt-1">
                conectados a la sala
              </div>
            </div>
          </div>
        )}

        {/* Access Code display */}
        {accessCode && (
          <div className="mb-12">
            <p className="text-sm text-white/50 mb-3 uppercase tracking-wider">
              Código de acceso
            </p>
            <div className="inline-flex gap-3">
              {accessCode.split("").map((char, i) => (
                <div
                  key={i}
                  className="w-16 h-20 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center text-4xl font-mono font-bold backdrop-blur-sm"
                >
                  {char}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* URL / QR placeholder */}
        <div className="flex items-center justify-center gap-4 text-white/30">
          <QrCode className="w-6 h-6" />
          <span className="text-lg font-mono">{votingUrl}</span>
        </div>
      </div>

      {/* Clock in corner */}
      <div className="absolute bottom-8 right-8 text-white/30 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        <span className="text-2xl font-mono tabular-nums">
          {currentTime.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* CSS animation */}
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
