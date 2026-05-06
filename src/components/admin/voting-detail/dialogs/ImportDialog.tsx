import { ChangeEvent } from "react";
import { XCircle } from "lucide-react";

interface Props {
  isImportOpen: boolean;
  setIsImportOpen: (v: boolean) => void;
  importingFile: boolean;
  handleFileImport: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ImportDialog({ isImportOpen, setIsImportOpen, importingFile, handleFileImport }: Props) {
  if (!isImportOpen) return null;
  return (
    <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsImportOpen(false); }}>
      <div className="avd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="avd-dialog-head flex justify-between items-start gap-3">
          <div>
            <h2>Importar candidatos</h2>
            <p>Sube un archivo CSV, XML o JSON con los candidatos.</p>
          </div>
          <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsImportOpen(false)}>
            <XCircle size={14} />
          </button>
        </div>
        <div className="avd-dialog-body">
          <div className="avd-form-grid">
            {importingFile && (
              <div className="flex items-center gap-2 text-[13px] text-[var(--avd-fg-muted)]">
                <div className="w-3.5 h-3.5 border-2 border-[var(--avd-border)] border-t-[var(--avd-brand)] rounded-full animate-spin shrink-0 [animation-duration:0.7s]" />
                Importando candidatos...
              </div>
            )}
            <div className="border-[1.5px] border-dashed border-[var(--avd-border)] rounded-[var(--avd-radius-sm)] px-[14px] py-3 bg-[var(--avd-bg-sunken)]">
              <input className="avd-input h-auto py-1 px-0 bg-transparent border-none shadow-none" type="file" accept=".csv,.xml,.json" onChange={handleFileImport} disabled={importingFile} />
            </div>
            <p className="text-[12px] text-[var(--avd-fg-muted)] m-0">Formatos: CSV, XML, JSON. Campos: nombre, apellido, ubicación, grupo, edad.</p>
          </div>
        </div>
        <div className="avd-dialog-foot">
          <button className="avd-btn avd-btn-sm" onClick={() => setIsImportOpen(false)}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
