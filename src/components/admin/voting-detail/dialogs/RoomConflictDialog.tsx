interface Props {
  salaConflict: { id: string; title: string } | null;
  setSalaConflict: (v: { id: string; title: string } | null) => void;
  resolveRoomConflict: () => void | Promise<void>;
}

export function RoomConflictDialog({ salaConflict, setSalaConflict, resolveRoomConflict }: Props) {
  if (!salaConflict) return null;
  return (
    <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setSalaConflict(null); }}>
      <div className="avd-dialog max-w-[400px]" onClick={(e) => e.stopPropagation()}>
        <div className="avd-dialog-head">
          <h2>Sala activa detectada</h2>
          <p>Ya existe otra sala activa: <strong>{salaConflict.title}</strong>.</p>
        </div>
        <div className="avd-dialog-body">
          <p className="text-[13px] text-[var(--avd-fg-muted)] m-0">
            No pueden haber dos salas activas simultáneamente. ¿Quieres pausar «{salaConflict.title}» y activar esta sala?
          </p>
        </div>
        <div className="avd-dialog-foot">
          <button className="avd-btn avd-btn-sm" onClick={() => setSalaConflict(null)}>Cancelar</button>
          <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={resolveRoomConflict}>
            Pausar sala activa y continuar
          </button>
        </div>
      </div>
    </div>
  );
}
