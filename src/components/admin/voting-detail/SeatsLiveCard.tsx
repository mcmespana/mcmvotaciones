import type { RoundDetail, SeatRow, SeatStatus } from "./hooks/useRoundDetail";

interface Props {
  round: RoundDetail;
  activeCandidatesCount: number;
  isProjectingSomething: boolean;
  projLabel: string;
  seats: SeatRow[];
  seatStatus: SeatStatus | null;
  currentRoundVotes: number;
  occupiedPct: number;
  votesPct: number;
}

export function SeatsLiveCard({
  round, activeCandidatesCount, isProjectingSomething, projLabel,
  seats, seatStatus, currentRoundVotes, occupiedPct, votesPct,
}: Props) {
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
          <div className="flex gap-2">
            <div className="avd-seat-stat flex-1">
              <div className="avd-n avd-ok">{seatStatus?.occupied_seats ?? 0}</div>
              <div className="avd-l">Ocupados</div>
            </div>
            <div className="avd-seat-stat flex-1">
              <div className="avd-n avd-warn">{seatStatus?.expired_seats ?? 0}</div>
              <div className="avd-l">Expirados</div>
            </div>
            <div className="avd-seat-stat flex-1">
              <div className="avd-n">{seatStatus?.available_seats ?? 0}</div>
              <div className="avd-l">Libres</div>
            </div>
          </div>
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
                seats.slice(0, 12).map((s) => (
                  <div key={s.id} className="avd-seat-row">
                    <span className="avd-sid">{s.browser_instance_id.slice(0, 10)}</span>
                    <span className={`avd-sst ${s.estado === "ocupado" ? "avd-ok" : s.estado === "expirado" ? "avd-exp" : "avd-free"}`}>
                      {s.estado}
                    </span>
                    <span className="avd-st">
                      {new Date(s.last_seen_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Info compacta (abajo) ── */}
      <div className="px-4 py-3 flex flex-col gap-2 text-[12.5px]">
        <div className="flex justify-between items-center text-[var(--avd-fg-muted)]">
          <span>Candidatas</span>
          <span className="font-semibold text-[var(--avd-fg)] tabular-nums">{activeCandidatesCount}</span>
        </div>
        <div className="flex justify-between items-center text-[var(--avd-fg-muted)]">
          <span>Censo</span>
          <span className="font-semibold text-[var(--avd-fg)] tabular-nums">
            {round.max_votantes}
            <span className="font-normal text-[11px] ml-1">{round.census_mode === "exact" ? "exacto" : "máx"}</span>
          </span>
        </div>
        <div className="flex justify-between items-center text-[var(--avd-fg-muted)]">
          <span>Proyección</span>
          <span className={`font-semibold tabular-nums ${isProjectingSomething ? "text-[var(--avd-brand)]" : "text-[var(--avd-fg)]"}`}>
            {projLabel}
          </span>
        </div>
      </div>

    </aside>
  );
}
