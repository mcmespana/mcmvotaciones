import type { RoundDetail, SeatRow, SeatStatus } from "./hooks/useRoundDetail";

interface Props {
  round: RoundDetail;
  candidates: { is_eliminated?: boolean }[];
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
  round, candidates, activeCandidatesCount, isProjectingSomething, projLabel,
  seats, seatStatus, currentRoundVotes, occupiedPct, votesPct,
}: Props) {
  return (
    <aside className="avd-col avd-col-left">
      <div className="px-4 pt-[14px] pb-2 border-b border-[var(--avd-border-soft)]">
        <h3 className="avd-section-title m-0">
          Información
          <span className="avd-hint">
            <span className="avd-pulse-dot w-1.5 h-1.5" /> En vivo
          </span>
        </h3>
      </div>
      <div className="avd-kpi-panel">
        <div className="avd-kpi-stack">
          <div className="avd-kpi">
            <div className="avd-kpi-label">Candidatas</div>
            <div className="avd-kpi-value avd-tabular">{activeCandidatesCount}</div>
            <div className="avd-kpi-meta">
              {candidates.length - activeCandidatesCount} eliminadas
            </div>
          </div>
          <div className="avd-kpi" data-accent={round.census_mode === "exact" ? "warn" : undefined}>
            <div className="avd-kpi-label">Censo</div>
            <div className="avd-kpi-value avd-tabular">
              {round.max_votantes}
            </div>
            <div className="avd-kpi-meta">
              {round.census_mode === "exact" ? "Exacto" : "Máximo"}
            </div>
          </div>
          <div className="avd-kpi" data-accent={isProjectingSomething ? "brand" : undefined}>
            <div className="avd-kpi-label">Proyección</div>
            <div className="avd-kpi-value text-[16px]">{projLabel}</div>
            <div className="avd-kpi-meta">{isProjectingSomething ? "En pantalla" : "Sin difundir"}</div>
          </div>
        </div>
      </div>

      {/* Conexiones en vivo */}
      <div className="border-t border-[var(--avd-border-soft)] px-4 pt-[14px] pb-2">
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
          <div className="avd-seat-grid">
            <div className="avd-seat-stat">
              <div className="avd-n avd-ok">{seatStatus?.occupied_seats ?? 0}</div>
              <div className="avd-l">Ocupados</div>
            </div>
            <div className="avd-seat-stat">
              <div className="avd-n avd-warn">{seatStatus?.expired_seats ?? 0}</div>
              <div className="avd-l">Expirados</div>
            </div>
            <div className="avd-seat-stat">
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
    </aside>
  );
}
