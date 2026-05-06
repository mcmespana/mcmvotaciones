import { XCircle } from "lucide-react";
import { testDatasets } from "@/lib/testDatasets";

interface Props {
  isDatasetOpen: boolean;
  setIsDatasetOpen: (v: boolean) => void;
  selectedDatasetId: string;
  setSelectedDatasetId: (v: string) => void;
  loadingDataset: boolean;
  loadDataset: () => void;
}

export function DatasetDialog({ isDatasetOpen, setIsDatasetOpen, selectedDatasetId, setSelectedDatasetId, loadingDataset, loadDataset }: Props) {
  if (!isDatasetOpen) return null;
  return (
    <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsDatasetOpen(false); }}>
      <div className="avd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="avd-dialog-head flex justify-between items-start gap-3">
          <div>
            <h2>Cargar dataset de ejemplo</h2>
            <p>Inserta un dataset predefinido para pruebas rápidas.</p>
          </div>
          <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsDatasetOpen(false)}>
            <XCircle size={14} />
          </button>
        </div>
        <div className="avd-dialog-body">
          <div className="avd-form-field">
            <label className="avd-label">Dataset</label>
            <select className="avd-select" value={selectedDatasetId} onChange={(e) => setSelectedDatasetId(e.target.value)}>
              {testDatasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.emoji} {dataset.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="avd-dialog-foot">
          <button className="avd-btn avd-btn-sm" onClick={() => setIsDatasetOpen(false)} disabled={loadingDataset}>Cancelar</button>
          <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={loadDataset} disabled={loadingDataset}>
            {loadingDataset ? "Cargando..." : "Cargar dataset"}
          </button>
        </div>
      </div>
    </div>
  );
}
