import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, XCircle, X } from "lucide-react";
import { formatCandidateName } from "@/lib/candidateFormat";
import { isImageFile, MAX_IMAGE_INPUT_BYTES } from "@/lib/candidateImage";
import type { Candidate } from "../hooks/useRoundDetail";
import type { CandidateFormState } from "../hooks/useCandidateActions";

interface ImageDropFieldProps {
  imageUrl: string;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  clearImageUrl: () => void;
}

function ImageDropField({ imageUrl, imageFile, setImageFile, clearImageUrl }: ImageDropFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const shownImage = previewUrl || imageUrl || null;

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!isImageFile(file)) { setFileError("Solo se admiten archivos de imagen."); return; }
    if (file.size > MAX_IMAGE_INPUT_BYTES) { setFileError("La imagen es demasiado grande (máx. 15 MB)."); return; }
    setFileError(null);
    setImageFile(file);
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileError(null);
    setImageFile(null);
    clearImageUrl();
  };

  return (
    <div className="avd-form-field">
      <label className="avd-label">Fotografía</label>
      <div
        className={`avd-imgdrop ${dragOver ? "avd-imgdrop-over" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        {shownImage ? (
          <>
            <img src={shownImage} alt="Foto de la candidata" className="avd-imgdrop-preview" loading="lazy" decoding="async" />
            <div className="avd-imgdrop-text">
              <strong>{imageFile ? imageFile.name : "Foto actual"}</strong>
              Arrastra otra imagen o pulsa para cambiarla.
            </div>
            <button type="button" className="avd-btn avd-btn-ghost avd-btn-icon-sm avd-imgdrop-remove" onClick={removeImage} title="Quitar imagen">
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <ImagePlus size={20} />
            <div className="avd-imgdrop-text">
              <strong>Arrastra una imagen aquí</strong>
              o pulsa para adjuntarla desde tu dispositivo.
            </div>
          </>
        )}
      </div>
      {fileError && <p className="avd-imgdrop-error">{fileError}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}

interface FormDialogProps {
  open: boolean;
  setOpen: (v: boolean) => void;
  title: string;
  description: string;
  candidateForm: CandidateFormState;
  setCandidateForm: React.Dispatch<React.SetStateAction<CandidateFormState>>;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  saving: boolean;
  onSave: () => void;
  saveLabel: string;
}

function FormDialog({ open, setOpen, title, description, candidateForm, setCandidateForm, imageFile, setImageFile, saving, onSave, saveLabel }: FormDialogProps) {
  if (!open) return null;
  return (
    <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="avd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="avd-dialog-head flex justify-between items-start gap-3">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setOpen(false)}>
            <XCircle size={14} />
          </button>
        </div>
        <div className="avd-dialog-body">
          <div className="avd-form-grid">
            <div className="avd-form-grid avd-form-grid-2">
              <div className="avd-form-field">
                <label className="avd-label">Nombre</label>
                <input className="avd-input" value={candidateForm.name} onChange={(e) => setCandidateForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="avd-form-field">
                <label className="avd-label">Apellidos</label>
                <input className="avd-input" value={candidateForm.surname} onChange={(e) => setCandidateForm((p) => ({ ...p, surname: e.target.value }))} />
              </div>
            </div>
            <div className="avd-form-grid avd-form-grid-2">
              <div className="avd-form-field">
                <label className="avd-label">Ubicación</label>
                <input className="avd-input" value={candidateForm.location} onChange={(e) => setCandidateForm((p) => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="avd-form-field">
                <label className="avd-label">Grupo / Comunidad</label>
                <input className="avd-input" value={candidateForm.group_name} onChange={(e) => setCandidateForm((p) => ({ ...p, group_name: e.target.value }))} />
              </div>
            </div>
            <div className="avd-form-field">
              <label className="avd-label">Descripción</label>
              <textarea className="avd-textarea" value={candidateForm.description} onChange={(e) => setCandidateForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <ImageDropField
              imageUrl={candidateForm.image_url}
              imageFile={imageFile}
              setImageFile={setImageFile}
              clearImageUrl={() => setCandidateForm((p) => ({ ...p, image_url: "" }))}
            />
          </div>
        </div>
        <div className="avd-dialog-foot">
          <button className="avd-btn avd-btn-sm" onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
          <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={onSave} disabled={saving}>{saving ? "Guardando..." : saveLabel}</button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  isAddCandidateOpen: boolean;
  setIsAddCandidateOpen: (v: boolean) => void;
  isEditCandidateOpen: boolean;
  setIsEditCandidateOpen: (v: boolean) => void;
  candidateForm: CandidateFormState;
  setCandidateForm: React.Dispatch<React.SetStateAction<CandidateFormState>>;
  candidateImageFile: File | null;
  setCandidateImageFile: (f: File | null) => void;
  savingCandidate: boolean;
  addCandidate: () => void;
  updateCandidate: () => void;
  candidateToSelect: Candidate | null;
  setCandidateToSelect: (c: Candidate | null) => void;
  quickSelectCandidate: (id: string) => void;
  candidateToUnselect: Candidate | null;
  setCandidateToUnselect: (c: Candidate | null) => void;
  unselectCandidate: (id: string) => void;
  candidateToDelete: Candidate | null;
  setCandidateToDelete: (c: Candidate | null) => void;
  deleteCandidate: (id: string) => void;
}

export function CandidateFormDialog(props: Props) {
  return (
    <>
      {/* Add candidate */}
      <FormDialog
        open={props.isAddCandidateOpen}
        setOpen={props.setIsAddCandidateOpen}
        title="Añadir candidata"
        description="Completa los datos principales. Podrás editar después."
        candidateForm={props.candidateForm}
        setCandidateForm={props.setCandidateForm}
        imageFile={props.candidateImageFile}
        setImageFile={props.setCandidateImageFile}
        saving={props.savingCandidate}
        onSave={props.addCandidate}
        saveLabel="Guardar candidata"
      />

      {/* Edit candidate */}
      <FormDialog
        open={props.isEditCandidateOpen}
        setOpen={props.setIsEditCandidateOpen}
        title="Editar candidata"
        description="Actualiza los datos de la candidata seleccionada."
        candidateForm={props.candidateForm}
        setCandidateForm={props.setCandidateForm}
        imageFile={props.candidateImageFile}
        setImageFile={props.setCandidateImageFile}
        saving={props.savingCandidate}
        onSave={props.updateCandidate}
        saveLabel="Guardar cambios"
      />

      {/* Modal: Quick select candidate */}
      {props.candidateToSelect && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) props.setCandidateToSelect(null); }}>
          <div className="avd-dialog max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Seleccionar directamente?</h2>
              <p>Vas a forzar la selección de este candidato ahora mismo y será marcado como seleccionado en esta ronda.</p>
            </div>
            <div className="avd-dialog-body">
              <div className="px-[14px] py-3 rounded-[var(--avd-radius-sm)] bg-[var(--avd-bg-sunken)] border border-[var(--avd-border)] text-[13px] font-semibold text-[var(--avd-fg)]">
                {formatCandidateName(props.candidateToSelect)}
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => props.setCandidateToSelect(null)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={() => props.quickSelectCandidate(props.candidateToSelect!.id)}>Seleccionar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Unselect candidate */}
      {props.candidateToUnselect && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) props.setCandidateToUnselect(null); }}>
          <div className="avd-dialog max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Deshacer selección?</h2>
              <p>Quitarás a este candidato de la lista de seleccionados y volverá a estar disponible.</p>
            </div>
            <div className="avd-dialog-body">
              <div className="px-[14px] py-3 rounded-[var(--avd-radius-sm)] bg-[color-mix(in_oklch,var(--avd-warn)_15%,transparent)] border border-[color-mix(in_oklch,var(--avd-warn)_30%,transparent)] text-[13px] font-semibold text-[var(--avd-warn)]">
                {formatCandidateName(props.candidateToUnselect)}
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => props.setCandidateToUnselect(null)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm bg-[var(--avd-warn)] text-[var(--avd-warn-fg)] border-[color-mix(in_oklch,var(--avd-warn)_50%,#000)]" onClick={() => { const id = props.candidateToUnselect!.id; props.setCandidateToUnselect(null); props.unselectCandidate(id); }}>Desmarcar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete candidate */}
      {props.candidateToDelete && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) props.setCandidateToDelete(null); }}>
          <div className="avd-dialog max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Eliminar candidato?</h2>
              <p>Esta acción no se puede deshacer y el candidato se borrará de la lista.</p>
            </div>
            <div className="avd-dialog-body">
              <div className="px-[14px] py-3 rounded-[var(--avd-radius-sm)] bg-[var(--avd-bad-bg)] border border-[color-mix(in_oklch,var(--avd-bad)_25%,transparent)] text-[13px] font-semibold text-[var(--avd-bad-fg)]">
                {formatCandidateName(props.candidateToDelete)}
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => props.setCandidateToDelete(null)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-danger" onClick={() => props.deleteCandidate(props.candidateToDelete!.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
