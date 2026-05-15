import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Trash2, Wifi } from "lucide-react";
import type { RoundDetail, SeatRow, SeatStatus } from "./hooks/useRoundDetail";

interface Props {
  round: RoundDetail;
  seats: SeatRow[];
  seatStatus: SeatStatus | null;
  currentRoundVotes: number;
  occupiedPct: number;
  votesPct: number;
  liveSeatIds: Set<string> | null;
  presenceChecking: boolean;
  checkPresence: () => Promise<void>;
  releaseSeat: (seatId: string) => Promise<void>;
  releaseGhostSeats: (ghostIds: string[]) => Promise<number>;
}

export function SeatsLiveCard({
  round, seats, seatStatus, currentRoundVotes, occupiedPct, votesPct,
  liveSeatIds, presenceChecking, checkPresence, releaseSeat, releaseGhostSeats,
}: Props) {
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [releasingAll, setReleasingAll] = useState(false);

  const presenceReady = liveSeatIds !== null;

  const ghostIds = useMemo(
    () => presenceReady
      ? seats.filter(s => s.estado === "ocupado" && !liveSeatIds.has(s.id)).map(s => s.id)
      : [],
    [seats, liveSeatIds, presenceReady],
  );

  const handleReleaseSeat = async (seatId: string) => {
    setReleasingId(seatId);
    try { await releaseSeat(seatId); } finally { setReleasingId(null); }
  };

  const handleReleaseAll = async () => {
    setReleasingAll(true);
    try { await releaseGhostSeats(ghostIds); } finally { setReleasingAll(false); }
  };

  const occupied  = seatStatus?.occupied_seats  ?? 0;
  const expired   = seatStatus?.expired_seats   ?? 0;
  const available = seatStatus?.available_seats ?? 0;

  return (
    <div className="px-4 pt-[14px] pb-4">
      <h3 className="avd-section-title m-0 mb-3">
        Conexiones
        <span className="avd-hint">
          <span className="avd-pulse-dot w-1.5 h-1.5" /> Tiempo real
        </span>
      </h3>

      <div className="flex flex-col gap-3">

        {/* ── Stat cards ── */}
        <div className="avd-seat-grid">
          <div className="avd-seat-stat">
            <div className={`avd-n ${occupied > 0 ? "avd-ok" : ""}`}>{occupied}</div>
            <div className="avd-l">Ocupados</div>
          </div>
          <div className="avd-seat-stat">
            <div className={`avd-n ${expired > 0 ? "avd-warn" : ""}`}>{expired}</div>
            <div className="avd-l">Expirados</div>
          </div>
          <div className="avd-seat-stat">
            <div className="avd-n">{available}</div>
            <div className="avd-l">Libres</div>
          </div>
        </div>

        {/* ── Meters ── */}
        <div className="flex flex-col gap-2">
          <div>
            <div className="avd-meter-label">
              <span>Ocupación</span>
              <span className="avd-val">{occupied} / {round.max_votantes}</span>
            </div>
            <div className="avd-meter">
              <div className="avd-meter-fill avd-ok" style={{ width: `${Math.min(occupiedPct, 100)}%` }} />
            </div>
          </div>
          {round.is_voting_open && (
            <div>
              <div className="avd-meter-label">
                <span>Votos R{round.current_round_number}</span>
                <span className="avd-val">{currentRoundVotes} / {round.max_votantes}</span>
              </div>
              <div className="avd-meter">
                <div className="avd-meter-fill" style={{ width: `${Math.min(votesPct, 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Presence check + ghost release ── */}
        {presenceReady && ghostIds.length === 0 ? (
          <div className="avd-presence-ok">
            <CheckCircle2 size={13} />
            Todos conectados
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              className="avd-btn avd-btn-sm flex-1"
              disabled={presenceChecking}
              onClick={checkPresence}
            >
              <Wifi size={13} />
              {presenceChecking ? "Verificando…" : presenceReady ? "Re-verificar" : "Verificar presencia"}
            </button>
            {presenceReady && ghostIds.length > 0 && (
              <button
                className="avd-btn avd-btn-sm avd-btn-danger"
                disabled={releasingAll}
                onClick={handleReleaseAll}
                title={`Liberar ${ghostIds.length} asiento${ghostIds.length > 1 ? "s" : ""} fantasma`}
              >
                <Trash2 size={13} />
                {releasingAll ? "…" : `${ghostIds.length} fantasma${ghostIds.length > 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        )}

        {/* ── Sessions ── */}
        <button
          className="avd-sessions-toggle"
          onClick={() => setSessionsOpen(v => !v)}
        >
          <span>Sesiones <span className="avd-sessions-count">{seats.length}</span></span>
          <span className="flex items-center gap-1.5">
            <span className={`avd-chip avd-chip-xs ${round.join_locked ? "avd-chip-muted" : "avd-chip-ok"}`}>
              {round.join_locked ? "Bloqueada" : "Abierta"}
            </span>
            {sessionsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        </button>

        {sessionsOpen && (
          <div className="avd-seats-list">
            {seats.length === 0 ? (
              <p className="p-3 text-center text-[12px] text-[var(--avd-fg-muted)] m-0">Sin conexiones.</p>
            ) : (
              seats.slice(0, 12).map((s) => {
                const isOccupied = s.estado === "ocupado";
                const isLive = liveSeatIds?.has(s.id) ?? false;
                const isGhost = isOccupied && presenceReady && !isLive;

                return (
                  <div key={s.id} className="avd-seat-row">
                    <span
                      className="avd-seat-dot"
                      title={
                        !isOccupied ? undefined
                          : isLive ? "Conectado" : "Sin señal (fantasma)"
                      }
                      style={{
                        background: !isOccupied ? "transparent"
                          : isLive ? "var(--avd-ok)"
                          : presenceReady ? "var(--avd-bad)"
                          : "var(--avd-fg-faint)",
                      }}
                    />
                    <span className="avd-sid">{s.browser_instance_id.slice(0, 10)}</span>
                    <span className={`avd-sst ${s.estado === "ocupado" ? "avd-ok" : s.estado === "expirado" ? "avd-exp" : "avd-free"}`}>
                      {s.estado}
                    </span>
                    <span className="avd-st">
                      {new Date(s.last_seen_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isGhost && (
                      <button
                        className="avd-btn avd-btn-xs avd-btn-danger"
                        disabled={releasingId === s.id}
                        onClick={() => handleReleaseSeat(s.id)}
                        title="Liberar"
                      >
                        {releasingId === s.id ? "…" : <Trash2 size={10} />}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
