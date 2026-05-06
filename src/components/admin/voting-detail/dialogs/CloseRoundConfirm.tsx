import { Trash2 } from "lucide-react";
import type { RoundDetail } from "../hooks/useRoundDetail";

interface Props {
  isCloseRoundConfirmOpen: boolean;
  setIsCloseRoundConfirmOpen: (v: boolean) => void;
  closeVoting: () => void;
  isDeleteAllCandidatesOpen: boolean;
  setIsDeleteAllCandidatesOpen: (v: boolean) => void;
  deletingAllCandidates: boolean;
  handleDeleteAllCandidates: () => void;
  candidates: { id: string }[];
  round: RoundDetail | null;
}

export function CloseRoundConfirm({
  isCloseRoundConfirmOpen, setIsCloseRoundConfirmOpen, closeVoting,
  isDeleteAllCandidatesOpen, setIsDeleteAllCandidatesOpen, deletingAllCandidates, handleDeleteAllCandidates,
  candidates, round,
}: Props) {
  return (
    <>
      {/* Modal: Close Round */}
      {isCloseRoundConfirmOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsCloseRoundConfirmOpen(false); }}>
          <div className="avd-dialog max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Cerrar ronda definitivamente?</h2>
              <p>Se bloqueará y los asistentes no podrán participar.</p>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setIsCloseRoundConfirmOpen(false)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-danger" onClick={closeVoting}>Cerrar ronda</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete all candidates */}
      {isDeleteAllCandidatesOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsDeleteAllCandidatesOpen(false); }}>
          <div className="avd-dialog max-w-[440px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Eliminar todos los candidatos?</h2>
              <p>Se eliminarán los <strong>{candidates.length} candidatos</strong> de «{round?.title}». Esta acción no se puede deshacer.</p>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setIsDeleteAllCandidatesOpen(false)} disabled={deletingAllCandidates}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-danger" onClick={handleDeleteAllCandidates} disabled={deletingAllCandidates}>
                <Trash2 size={13} /> {deletingAllCandidates ? 'Eliminando...' : 'Eliminar todos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
