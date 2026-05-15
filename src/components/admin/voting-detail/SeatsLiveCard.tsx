import { useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import type { RoundDetail, SeatRow, SeatStatus } from "./hooks/useRoundDetail";

interface Props {
  round: RoundDetail;
  seats: SeatRow[];
  seatStatus: SeatStatus | null;
  currentRoundVotes: number;
  occupiedPct: number;
  votesPct: number;
  liveSeatIds: Set<string>;
  presenceReady: boolean;
  releaseSeat: (seatId: string) => Promise<void>;
  releaseGhostSeats: (ghostIds: string[]) => Promise<number>;
}

export function SeatsLiveCard({
  round, seats, seatStatus, currentRoundVotes, occupiedPct, votesPct,
  liveSeatIds, presenceReady, releaseSeat, releaseGhostSeats,
}: Props) {
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [releasingAll, setReleasingAll] = useState(false);

  const ghostIds = useMemo(
    () => seats.filter(s => s.estado === "ocupado" && presenceReady && !liveSeatIds.has(s.id)).map(s => s.id),
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

  return (
    <aside className="avd-col avd-col-left">

      {/* ── Conexiones (arriba) ── */}
      <div className="px-4 pt-[14px] pb-3 border-b border-[var(--avd-border-soft)]">
        <h3 className="avd-section-title m-0 mb-[10px]">
          Conexiones
          <span className="avd-hint">
            <span className="avd-pulse-dot w-1.5 h-1.5" /> Tiempo real
          </span>
        </h3>
        <div className="flex flex-col gap-[10px]">
          <div>
            <div className="avd-meter-label">
              <span>Ocupación</span>
              <span className="avd-val">{seatStatus?.occupied_seats ?? 0} / {round.max_votantes}</span>
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
          <div className="flex flex-col gap-1.5 text-[12.5px]">
            <div className="flex justify-between items-center">
              <span className="text-[var(--avd-fg-muted)]">Ocupados</span>
              <span className="font-bold tabular-nums text-[var(--avd-ok)]">{seatStatus?.occupied_seats ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--avd-fg-muted)]">Expirados</span>
              <span className="font-bold tabular-nums text-[var(--avd-warn)]">{seatStatus?.expired_seats ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--avd-fg-muted)]">Libres</span>
              <span className="font-bold tabular-nums text-[var(--avd-fg-muted)]">{seatStatus?.available_seats ?? 0}</span>
            </div>
          </div>

          {/* Presence summary + bulk release */}
          {presenceReady && ghostIds.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[12px] text-[var(--avd-bad)] font-semibold">
                {ghostIds.length} fantasma{ghostIds.length > 1 ? 's' : ''}
              </span>
              <button
                className="avd-btn avd-btn-sm avd-btn-danger"
                disabled={releasingAll}
                onClick={handleReleaseAll}
              >
                <Trash2 size={11} />
                {releasingAll ? 'Liberando…' : 'Liberar todos'}
              </button>
            </div>
          )}

          <div>
            <div className="avd-meter-label mb-1.5">
              <span>Sesiones ({seats.length})</span>
              <span className="text-[var(--avd-fg-faint)] text-[11px]">
                {round.join_locked ? "Bloqueada" : "Abierta"}
              </span>
            </div>
            <div className="avd-seats-list">
              {seats.length === 0 ? (
                <p className="p-3 text-center text-[12px] text-[var(--avd-fg-muted)] m-0">
                  Sin conexiones.
                </p>
              ) : (
                seats.slice(0, 12).map((s) => {
                  const isOccupied = s.estado === "ocupado";
                  const isLive = liveSeatIds.has(s.id);
                  const isGhost = isOccupied && presenceReady && !isLive;

                  return (
                    <div key={s.id} className="avd-seat-row">
                      {/* Presence indicator dot */}
                      {presenceReady && isOccupied ? (
                        <span
                          title={isLive ? "Conectado" : "Sin señal (fantasma)"}
                          style={{
                            display: "inline-block",
                            width: 7, height: 7,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: isLive
                              ? "var(--avd-ok)"
                              : "var(--avd-bad)",
                          }}
                        />
                      ) : (
                        <span style={{ display: "inline-block", width: 7, height: 7, flexShrink: 0 }} />
                      )}
                      <span className="avd-sid">{s.browser_instance_id.slice(0, 10)}</span>
                      <span className={`avd-sst ${s.estado === "ocupado" ? "avd-ok" : s.estado === "expirado" ? "avd-exp" : "avd-free"}`}>
                        {s.estado}
                      </span>
                      <span className="avd-st">
                        {new Date(s.last_seen_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isGhost && (
                        <button
                          className="avd-btn avd-btn-xs avd-btn-danger ml-auto"
                          disabled={releasingId === s.id}
                          onClick={() => handleReleaseSeat(s.id)}
                          title="Liberar asiento fantasma"
                        >
                          {releasingId === s.id ? '…' : <Trash2 size={10} />}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
}
