import { useEffect, useId, useRef, useState } from "react";
import { Copy } from "lucide-react";
import { computeDuplicateName, fetchRoundTitles, duplicateRound } from "@/lib/duplicateRound";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface DuplicateSource {
  id: string;
  title: string;
}

interface Props {
  source: DuplicateSource | null;
  onClose: () => void;
}

export function DuplicateVotingModal({ source, onClose }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [newTitle, setNewTitle] = useState("");
  const [preserveState, setPreserveState] = useState(false);
  const [loading, setLoading] = useState(false);

  // Compute default name when source changes
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    fetchRoundTitles().then((titles) => {
      if (cancelled) return;
      setNewTitle(computeDuplicateName(source.title, titles));
    });
    return () => { cancelled = true; };
  }, [source]);

  // Focus input once name is ready
  useEffect(() => {
    if (newTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [newTitle]);

  if (!source) return null;

  const handleSubmit = async () => {
    const title = newTitle.trim();
    if (!title) {
      toast({ title: "Nombre obligatorio", description: "Escribe un nombre para la nueva votación.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const newId = await duplicateRound(source.id, title, preserveState);
      toast({ title: "Votación duplicada", description: title });
      onClose();
      navigate(`/admin/votaciones/${newId}`);
    } catch (err) {
      toast({
        title: "Error al duplicar",
        description: err instanceof Error ? err.message : "No se pudo duplicar la votación.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleSubmit();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="avd-dialog-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="avd-dialog max-w-[90vw] sm:max-w-[480px]" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>

        <div className="avd-dialog-head">
          <div className="flex items-center gap-2 mb-1">
            <Copy size={15} className="text-[var(--avd-brand)]" />
            <h2>Duplicar votación</h2>
          </div>
          <p>Se copian la configuración y los candidatos. Se genera un código de sala nuevo.</p>
        </div>

        <div className="avd-dialog-body flex flex-col gap-4">

          {/* Source info */}
          <div className="px-[14px] py-[10px] rounded-[var(--avd-radius-sm)] bg-[var(--avd-bg-sunken)] border border-[var(--avd-border-soft)] text-[12.5px] text-[var(--avd-fg-muted)]">
            <span className="font-semibold text-[var(--avd-fg)]">Origen: </span>
            {source.title}
          </div>

          {/* New name */}
          <div className="avd-form-field">
            <label className="avd-label" htmlFor={inputId}>Nombre de la copia</label>
            <input
              id={inputId}
              ref={inputRef}
              className="avd-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {/* Toggle preserve candidate state */}
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <div className="relative mt-[2px] shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={preserveState}
                onChange={(e) => setPreserveState(e.target.checked)}
                disabled={loading}
              />
              <div
                className="w-[34px] h-[18px] rounded-full transition-colors duration-150"
                style={{
                  background: preserveState ? "var(--avd-brand)" : "var(--avd-border)",
                }}
              >
                <div
                  className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-150"
                  style={{ transform: preserveState ? "translateX(18px)" : "translateX(2px)" }}
                />
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[var(--avd-fg)] leading-[1.3]">Conservar estado de candidatas</div>
              <div className="text-[11.5px] text-[var(--avd-fg-muted)] mt-0.5 leading-[1.4]">
                Preserva eliminadas y seleccionadas. Desactivado: todos empiezan como activas.
              </div>
            </div>
          </label>

          {/* Info notice */}
          <div className="flex gap-2 px-[12px] py-[9px] rounded-[var(--avd-radius-sm)] bg-[color-mix(in_oklch,var(--avd-brand)_8%,transparent)] border border-[color-mix(in_oklch,var(--avd-brand)_20%,transparent)] text-[11.5px] text-[var(--avd-fg-muted)]">
            <svg className="shrink-0 mt-[1px] text-[var(--avd-brand)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <span>No se copian votos, asientos ni resultados. El código de sala siempre se regenera.</span>
          </div>

        </div>

        <div className="avd-dialog-foot">
          <button className="avd-btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="avd-btn avd-btn-primary" onClick={handleSubmit} disabled={loading || !newTitle.trim()}>
            {loading
              ? <><span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Duplicando...</>
              : <><Copy size={13} /> Duplicar</>
            }
          </button>
        </div>

      </div>
    </div>
  );
}
