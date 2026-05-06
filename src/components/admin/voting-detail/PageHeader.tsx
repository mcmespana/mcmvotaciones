import { ArrowLeft, ArrowUpRight, BarChart2, Check, Copy, Download, Moon, Play, Settings2, StepForward, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TeamChip } from "@/components/admin/TeamChip";
import { WORKFLOW_STEPS } from "@/hooks/useRoundWorkflow";
import type { RoundDetail } from "./hooks/useRoundDetail";

interface Props {
  round: RoundDetail;
  now: number;
  theme: string | undefined;
  setTheme: (t: string) => void;
  statusChip: { cls: string; txt: string };
  copyText: (text: string, successDescription: string) => Promise<void>;
  openAnalyticsDialog: () => void;
  openBallotsDialog: () => void;
  exportBallotsCsv: () => void;
  setIsSettingsOpen: (v: boolean) => void;
  stage: number;
  workflowActionLabel: string;
  workflowActionDisabled: boolean;
  isWorkflowRunning: boolean;
  runProjectionWorkflowStep: () => void;
}

export function PageHeader({
  round, now, theme, setTheme, statusChip, copyText,
  openAnalyticsDialog, openBallotsDialog, exportBallotsCsv, setIsSettingsOpen,
  stage, workflowActionLabel, workflowActionDisabled, isWorkflowRunning, runProjectionWorkflowStep,
}: Props) {
  const navigate = useNavigate();

  return (
    <>
      {/* ═══ Topbar ═══ */}
      <header className="avd-topbar">
        <div className="avd-topbar-brand">
          <div className="avd-brand-mark">C</div>
          <span>VotacionesMCM</span>
        </div>
        <div className="avd-topbar-spacer" />
        <span className="avd-chip avd-chip-mono avd-chip-muted">
          {new Date(now).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
        <button
          className="avd-btn avd-btn-ghost avd-btn-icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Cambiar tema"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </header>

      {/* ═══ Page header ═══ */}
      <section className="avd-page-header">

        {/* Row 1: nav + actions */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <button className="avd-btn avd-btn-sm avd-btn-ghost" onClick={() => navigate("/admin/votaciones")}>
            <ArrowLeft size={13} /> Volver a votaciones
          </button>
          <div className="avd-header-actions">
            <button className="avd-btn avd-btn-sm" onClick={openAnalyticsDialog}>
              <BarChart2 size={14} /> Análisis
            </button>
            <button className="avd-btn avd-btn-sm" onClick={openBallotsDialog}>
              <Download size={14} /> Papeletas
            </button>
            <button className="avd-btn avd-btn-sm" onClick={exportBallotsCsv}>
              <Download size={14} /> CSV
            </button>
            <button className="avd-btn avd-btn-sm" onClick={() => setIsSettingsOpen(true)}>
              <Settings2 size={14} /> Ajustes
            </button>
            <a className="avd-btn avd-btn-sm avd-btn-primary" href="/proyeccion" target="_blank" rel="noreferrer">
              Proyección <ArrowUpRight size={14} />
            </a>
          </div>
        </div>

        {/* Row 2: Title */}
        <h1 className="font-[var(--avd-font-sans)] text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-[10px] leading-[1.1] text-[var(--avd-fg)]">
          {round.title}
        </h1>

        {/* Row 3: Meta chips */}
        <div className="avd-page-meta mb-[14px]">
          <span className={`avd-chip ${statusChip.cls} h-6 text-[12px]`}>
            {round.is_voting_open && <span className="avd-pulse-dot mr-0.5" />}
            {statusChip.txt}
          </span>
          <span className="avd-chip avd-chip-muted">Ronda {round.current_round_number}</span>
          <TeamChip label={round.voting_type_name || round.team} />
          {round.year && <span className="avd-chip avd-chip-muted">{round.year}</span>}
          <span className="avd-chip avd-chip-mono gap-1" title="Código de acceso">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--avd-brand)] shrink-0 inline-block" />
            {round.access_code || "––––"}
            <button
              onClick={() => copyText(round.access_code || "", "Código copiado")}
              className="bg-none border-none cursor-pointer p-0 flex items-center text-[var(--avd-fg-faint)]"
            >
              <Copy size={10} />
            </button>
          </span>
          {round.description && (
            <span className="text-[12px] text-[var(--avd-fg-muted)] ml-0.5">· {round.description}</span>
          )}
        </div>

        {/* Workflow Rail */}
        <div className="avd-wf-rail">
          <div className="avd-wf-steps">
            {WORKFLOW_STEPS.map((s, i) => {
              const status = i < stage ? "done" : i === stage ? "current" : "pending";
              return (
                <div key={s.id} className={`avd-wf-step ${status}`}>
                  <div className="avd-wf-bullet">
                    {status === "done" ? <Check size={12} /> : i + 1}
                  </div>
                  <div className="avd-wf-text">
                    <div className="avd-wf-label">{s.label}</div>
                    <div className="avd-wf-sub">
                      {status === "done" ? "Hecho" : status === "current" ? "Siguiente paso" : s.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="avd-wf-cta">
            <button
              className="avd-btn avd-btn-primary avd-btn-primary-lg"
              onClick={runProjectionWorkflowStep}
              disabled={workflowActionDisabled}
            >
              {isWorkflowRunning
                ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                : workflowActionLabel === "Abrir sala" || workflowActionLabel === "Iniciar votación"
                ? <Play size={16} />
                : <StepForward size={16} />}
              {isWorkflowRunning ? "Procesando..." : workflowActionLabel}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
