import { RefreshCw, XCircle } from "lucide-react";
import { generateAccessCode } from "@/lib/accessCode";
import type { RoundDetail } from "../hooks/useRoundDetail";

interface Props {
  isSettingsOpen: boolean;
  setIsSettingsOpen: (v: boolean) => void;
  round: RoundDetail;
  configAccessCode: string;
  setConfigAccessCode: (v: string) => void;
  configCensusMode: "maximum" | "exact";
  setConfigCensusMode: (v: "maximum" | "exact") => void;
  configMaxVotantes: number;
  setConfigMaxVotantes: (v: number) => void;
  configMaxSelected: number;
  setConfigMaxSelected: (v: number) => void;
  configMaxVotesPerRound: number;
  setConfigMaxVotesPerRound: (v: number) => void;
  isMaxVotantesLocked: boolean;
  isVotingStarted: boolean;
  savingConfig: boolean;
  saveConfig: () => void;
}

export function SettingsDialog({
  isSettingsOpen, setIsSettingsOpen, round,
  configAccessCode, setConfigAccessCode,
  configCensusMode, setConfigCensusMode,
  configMaxVotantes, setConfigMaxVotantes,
  configMaxSelected, setConfigMaxSelected,
  configMaxVotesPerRound, setConfigMaxVotesPerRound,
  isMaxVotantesLocked, isVotingStarted, savingConfig, saveConfig,
}: Props) {
  if (!isSettingsOpen) return null;
  return (
    <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsSettingsOpen(false); }}>
      <div className="avd-dialog max-w-[660px]" onClick={(e) => e.stopPropagation()}>
        <div className="avd-dialog-head flex justify-between items-start gap-3">
          <div>
            <h2>Configuración de la votación</h2>
          </div>
          <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsSettingsOpen(false)}>
            <XCircle size={14} />
          </button>
        </div>
        <div className="avd-dialog-body">
          <div className="flex flex-col gap-[14px]">
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">

            <div className="avd-form-field">
              <label className="avd-label">Código de acceso</label>
              <div className="flex gap-1.5">
                <input
                  className="avd-input font-[var(--avd-font-mono)] tracking-[0.12em] font-bold"
                  value={configAccessCode}
                  maxLength={4}
                  onChange={(e) => setConfigAccessCode(e.target.value.toUpperCase())}
                />
                <button className="avd-btn avd-btn-sm shrink-0" onClick={() => setConfigAccessCode(generateAccessCode())}>
                  <RefreshCw size={13} /> Generar
                </button>
              </div>
            </div>
            <div className="avd-form-field">
              <label className="avd-label">Modo de censo</label>
              <select className="avd-select" value={configCensusMode} onChange={(e) => setConfigCensusMode(e.target.value as "maximum" | "exact")}>
                <option value="maximum">Máximo (inicio manual)</option>
                <option value="exact">Exacto (conectados = cupo)</option>
              </select>
            </div>
            </div>

            {round.voting_type_name && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--avd-radius-sm)] bg-[var(--avd-brand-bg)] border border-[var(--avd-brand-border)] text-[13px]">
                <span className="text-[var(--avd-fg-muted)]">Tipo base:</span>
                <span className="avd-chip avd-chip-brand h-5 text-[11px]">{round.voting_type_name}</span>
                <span className="text-[12px] text-[var(--avd-fg-faint)]">Los valores se pueden ajustar sin cambiar el tipo.</span>
              </div>
            )}

            <div className="grid gap-3 items-start [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <div className="avd-form-field">
                <label className="avd-label">Nº máx. votantes {isMaxVotantesLocked && <span className="avd-chip avd-chip-muted ml-1.5">Bloqueado</span>}</label>
                <input
                  className={`avd-input${isMaxVotantesLocked ? " bg-[var(--avd-bg-sunken)] text-[var(--avd-fg-muted)]" : ""}`}
                  type="number"
                  min={1}
                  max={9999}
                  value={configMaxVotantes}
                  onChange={(e) => setConfigMaxVotantes(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={isMaxVotantesLocked}
                />
                {isMaxVotantesLocked && <p className="text-[11px] text-[var(--avd-fg-faint)] mt-[3px]">Se puede configurar solo antes de abrir la sala.</p>}
              </div>

              <div className="avd-form-field">
                <label className="avd-label">Total a seleccionar {isVotingStarted && <span className="avd-chip avd-chip-muted ml-1.5">Bloqueado</span>}</label>
                <input
                  className={`avd-input${isVotingStarted ? " bg-[var(--avd-bg-sunken)] text-[var(--avd-fg-muted)]" : ""}`}
                  type="number"
                  min={1}
                  max={100}
                  value={configMaxSelected}
                  onChange={(e) => setConfigMaxSelected(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={isVotingStarted}
                />
                {isVotingStarted && <p className="text-[11px] text-[var(--avd-fg-faint)] mt-[3px]">No editable con votación en curso.</p>}
              </div>

              <div className="avd-form-field">
                <label className="avd-label">Máx. votos por ronda</label>
                <input
                  className="avd-input"
                  type="number"
                  min={0}
                  max={100}
                  value={configMaxVotesPerRound}
                  onChange={(e) => setConfigMaxVotesPerRound(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <p className="text-[11px] text-[var(--avd-fg-faint)] mt-[3px]">
                  0 = sin límite fijo (máx. 3 por lógica automática).
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="avd-dialog-foot">
          <button className="avd-btn avd-btn-sm" onClick={() => setIsSettingsOpen(false)}>Cancelar</button>
          <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={saveConfig} disabled={savingConfig}>
            {savingConfig ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
