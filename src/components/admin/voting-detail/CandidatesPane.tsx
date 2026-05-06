import { ArrowUpRight, Download, Grid, ImageUp, List, Pencil, Search, Trash2, Undo2, Upload, UserPlus } from "lucide-react";
import { formatCandidateName } from "@/lib/candidateFormat";
import type { Candidate } from "./hooks/useRoundDetail";

interface Props {
  candidates: Candidate[];
  filteredCandidates: Candidate[];
  selectedCandidatesCount: number;
  activeCandidatesCount: number;
  hasCandidates: boolean;
  isVotingStarted: boolean;
  candidateView: "list" | "grid";
  setCandidateView: (v: "list" | "grid") => void;
  candidateSearch: string;
  setCandidateSearch: (v: string) => void;
  openAddCandidateDialog: () => void;
  setIsImportOpen: (v: boolean) => void;
  openComunicaImport: () => void;
  setIsDeleteAllCandidatesOpen: (v: boolean) => void;
  setIsDatasetOpen: (v: boolean) => void;
  hasCandidatesWithCrm: boolean;
  refetchingPhotos: boolean;
  onRefetchPhotos: () => void;
  openEditCandidateDialog: (c: Candidate) => void;
  setCandidateToSelect: (c: Candidate | null) => void;
  setCandidateToUnselect: (c: Candidate | null) => void;
  setCandidateToDelete: (c: Candidate | null) => void;
  candidatesRef: React.RefObject<HTMLDivElement> | ((node: HTMLDivElement | null) => void);
  initials: (c: Candidate) => string;
}

export function CandidatesPane({
  filteredCandidates, selectedCandidatesCount, activeCandidatesCount, hasCandidates, isVotingStarted,
  candidateView, setCandidateView, candidateSearch, setCandidateSearch,
  openAddCandidateDialog, setIsImportOpen, openComunicaImport, setIsDeleteAllCandidatesOpen, setIsDatasetOpen,
  hasCandidatesWithCrm, refetchingPhotos, onRefetchPhotos,
  openEditCandidateDialog, setCandidateToSelect, setCandidateToUnselect, setCandidateToDelete,
  candidatesRef, initials,
}: Props) {
  return (
    <main className="avd-col avd-col-main">
      <div className="avd-col-inner">
        <div className="avd-candidates-pane">
          <div className="avd-candidates-head">
              <div className="avd-candidates-head-left">
                <h2>Candidatas</h2>
                <span className="avd-counts">
                  {selectedCandidatesCount} seleccionadas · {activeCandidatesCount} activas
                </span>
              </div>
              <div className="avd-candidates-head-right">
                <div className="avd-segmented">
                  <button className={candidateView === "list" ? "active" : ""} onClick={() => setCandidateView("list")}>
                    <List size={13} /> Lista
                  </button>
                  <button className={candidateView === "grid" ? "active" : ""} onClick={() => setCandidateView("grid")}>
                    <Grid size={13} /> Tarjetas
                  </button>
                </div>
                <div className="avd-search-wrap w-[180px]">
                  <Search size={14} />
                  <input
                    className="avd-input"
                    placeholder="Buscar candidata..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                  />
                </div>
                {!isVotingStarted && (
                  <>
                    <button className="avd-btn avd-btn-icon-sm" style={{width:28,height:28}} onClick={openAddCandidateDialog} title="Añadir candidata">
                      <UserPlus size={14} />
                    </button>
                    <button className="avd-btn avd-btn-icon-sm" style={{width:28,height:28}} onClick={() => setIsDatasetOpen(true)} title="Cargar dataset de prueba">
                      <Download size={14} />
                    </button>
                    <button className="avd-btn avd-btn-icon-sm" style={{width:28,height:28}} onClick={() => setIsImportOpen(true)} title="Importar CSV">
                      <Upload size={14} />
                    </button>
                    <button className="avd-btn avd-btn-icon-sm" style={{width:28,height:28}} onClick={openComunicaImport} title="Importar desde Comunica">
                      <ArrowUpRight size={14} />
                    </button>
                  </>
                )}
                {hasCandidatesWithCrm && (
                  <button
                    className="avd-btn avd-btn-icon-sm"
                    style={{width:28,height:28}}
                    onClick={onRefetchPhotos}
                    disabled={refetchingPhotos}
                    title={refetchingPhotos ? "Importando fotos..." : "Actualizar fotos desde CRM"}
                  >
                    <ImageUp size={14} />
                  </button>
                )}
                {!isVotingStarted && hasCandidates && (
                  <button
                    className="avd-btn avd-btn-icon-sm text-[var(--avd-bad)]"
                    style={{width:28,height:28}}
                    onClick={() => setIsDeleteAllCandidatesOpen(true)}
                    title="Eliminar todas las candidatas"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="avd-candidates-shell" ref={candidatesRef as React.RefObject<HTMLDivElement>}>
              {filteredCandidates.length === 0 ? (
                <div className="avd-empty">
                  <UserPlus size={28} />
                  <p className="avd-empty-title">Sin candidatas</p>
                  <p className="avd-empty-sub">Usa Añadir o Importar para comenzar.</p>
                </div>
              ) : candidateView === "list" ? (
                filteredCandidates.map((c) => (
                  <div
                    key={c.id}
                    className={`avd-cand-row ${c.is_selected ? "avd-is-selected" : ""} ${c.is_eliminated ? "avd-is-eliminated" : ""}`}
                  >
                    <div className="avd-cand-avatar overflow-hidden">
                      {c.image_url
                        ? <img src={c.image_url} alt="" className="w-full h-full object-cover rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement!).dataset.initials = initials(c); (e.currentTarget.parentElement!).textContent = initials(c); }} />
                        : initials(c)}
                    </div>
                    <div className="avd-cand-info">
                      <div className="avd-cand-name">{formatCandidateName(c)}</div>
                      <div className="avd-cand-meta">
                        {c.location || "Sin ubicación"}
                        {c.group_name && <> · {c.group_name}</>}
                        {c.age && <> · {c.age} años</>}
                      </div>
                    </div>
                    <div className="avd-cand-badges">
                      {c.is_selected && <span className="avd-chip avd-chip-ok h-5 text-[11px]">Seleccionada</span>}
                      {c.is_eliminated && <span className="avd-chip avd-chip-bad h-5 text-[11px]">Eliminada</span>}
                    </div>
                    <div className="avd-cand-actions">
                      <button
                        className="avd-btn avd-btn-ghost avd-btn-icon-sm"
                        onClick={() => openEditCandidateDialog(c)}
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      {!c.is_selected && !c.is_eliminated && (
                        <button
                          className="avd-btn avd-btn-ghost avd-btn-icon-sm"
                          onClick={() => setCandidateToSelect(c)}
                          title="Añadir a seleccionados directamente"
                        >
                          <UserPlus size={13} />
                        </button>
                      )}
                      {c.is_selected && (
                        <button
                          className="avd-btn avd-btn-ghost avd-btn-icon-sm"
                          onClick={() => setCandidateToUnselect(c)}
                          title="Deshacer selección"
                        >
                          <Undo2 size={13} />
                        </button>
                      )}
                      {!isVotingStarted && (
                        <button
                          className="avd-btn avd-btn-ghost avd-btn-icon-sm text-[var(--avd-fg-faint)]"
                          onClick={() => setCandidateToDelete(c)}
                          title="Eliminar"
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--avd-bad)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--avd-fg-faint)")}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="avd-cand-grid">
                  {filteredCandidates.map((c) => (
                    <div
                      key={c.id}
                      className={`avd-cand-card ${c.is_selected ? "avd-is-selected" : ""} ${c.is_eliminated ? "avd-is-eliminated" : ""}`}
                    >
                      <div className="avd-cand-card-head">
                        <div className="avd-cand-card-avatar overflow-hidden">
                          {c.image_url
                            ? <img src={c.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; e.currentTarget.parentElement!.textContent = initials(c); }} />
                            : initials(c)}
                        </div>
                        <div className="avd-cand-card-body">
                          <div className="avd-cand-card-name">{formatCandidateName(c)}</div>
                          <div className="avd-cand-card-meta">
                            {c.location}{c.age && ` · ${c.age}a`}
                          </div>
                        </div>
                      </div>
                      {c.group_name && (
                        <div className="text-[11.5px] text-[var(--avd-fg-muted)]">{c.group_name}</div>
                      )}
                      <div className="avd-cand-card-foot">
                        <div className="flex gap-1">
                          {c.is_selected && <span className="avd-chip avd-chip-ok h-5 text-[11px]">Seleccionada</span>}
                          {c.is_eliminated && <span className="avd-chip avd-chip-bad h-5 text-[11px]">Eliminada</span>}
                        </div>
                        <div className="flex gap-0.5">
                          <button className="avd-btn avd-btn-ghost avd-btn-icon-sm" onClick={() => openEditCandidateDialog(c)} title="Editar">
                            <Pencil size={13} />
                          </button>
                          {!c.is_selected && !c.is_eliminated && (
                            <button className="avd-btn avd-btn-ghost avd-btn-icon-sm" onClick={() => setCandidateToSelect(c)} title="Añadir a seleccionados directamente">
                              <UserPlus size={13} />
                            </button>
                          )}
                          {c.is_selected && (
                            <button className="avd-btn avd-btn-ghost avd-btn-icon-sm" onClick={() => setCandidateToUnselect(c)} title="Deshacer selección">
                              <Undo2 size={13} />
                            </button>
                          )}
                          {!isVotingStarted && (
                            <button className="avd-btn avd-btn-ghost avd-btn-icon-sm" onClick={() => setCandidateToDelete(c)} title="Eliminar">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
    </main>
  );
}
