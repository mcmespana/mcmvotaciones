import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface VotingType {
  id: string;
  name: string;
  max_selected_candidates: number;
  max_votes_per_round: number;
  census_mode: "maximum" | "exact";
  is_system: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
  onTypesChanged?: () => void;
}

type VotingTypeForm = Omit<VotingType, "id" | "is_system">;
const EMPTY_FORM: VotingTypeForm = { name: "", max_selected_candidates: 1, max_votes_per_round: 0, census_mode: "maximum" };

export function VotingTypesManager({ open, onClose, isSuperAdmin, onTypesChanged }: Props) {
  const { toast } = useToast();
  const [types, setTypes] = useState<VotingType[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VotingTypeForm>(EMPTY_FORM);
  const [newForm, setNewForm] = useState<VotingTypeForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VotingType | null>(null);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("voting_types")
      .select("*")
      .order("is_system", { ascending: false })
      .order("name");
    setTypes((data || []) as VotingType[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) loadTypes();
  }, [open, loadTypes]);

  const startEdit = (t: VotingType) => {
    setEditingId(t.id);
    setEditForm({ name: t.name, max_selected_candidates: t.max_selected_candidates, max_votes_per_round: t.max_votes_per_round, census_mode: t.census_mode });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (editForm.max_selected_candidates < 1) { toast({ title: "Seleccionadas debe ser mínimo 1", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase
      .from("voting_types")
      .update({ name: editForm.name.trim(), max_selected_candidates: editForm.max_selected_candidates, max_votes_per_round: editForm.max_votes_per_round, census_mode: editForm.census_mode })
      .eq("id", editingId);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Tipo actualizado" });
    setEditingId(null);
    loadTypes();
    onTypesChanged?.();
  };

  const createType = async () => {
    const name = newForm.name.trim();
    if (!name) { toast({ title: "Nombre obligatorio", variant: "destructive" }); return; }
    if (newForm.max_selected_candidates < 1) { toast({ title: "Seleccionadas debe ser mínimo 1", variant: "destructive" }); return; }
    setCreating(true);
    const { error } = await supabase
      .from("voting_types")
      .insert([{ name, max_selected_candidates: newForm.max_selected_candidates, max_votes_per_round: newForm.max_votes_per_round, census_mode: newForm.census_mode, is_system: false }]);
    setCreating(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Tipo creado" });
    setNewForm(EMPTY_FORM);
    loadTypes();
    onTypesChanged?.();
  };

  const toggleSystemType = async (t: VotingType) => {
    const { error } = await supabase.from("voting_types").update({ is_system: !t.is_system }).eq("id", t.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: t.is_system ? "Tipo convertido a personalizado" : "Tipo promovido a sistema" });
    loadTypes(); onTypesChanged?.();
  };

  const deleteType = async (t: VotingType) => {
    const { error } = await supabase.from("voting_types").delete().eq("id", t.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Tipo eliminado" });
    setDeleteTarget(null);
    loadTypes();
    onTypesChanged?.();
  };

  if (!open) return null;

  return (
    <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="avd-dialog max-w-[560px]" onClick={e => e.stopPropagation()}>
        <div className="avd-dialog-head">
          <h2>Tipos de votación</h2>
          <p>Los tipos <strong>ECE</strong> y <strong>ECL</strong> son del sistema. Los personalizados pueden crearse y eliminarse libremente.</p>
        </div>

        <div className="avd-dialog-body flex flex-col gap-[10px]">
          {loading ? (
            <div className="text-center p-6 text-[var(--avd-fg-muted)]">Cargando...</div>
          ) : types.map(t => (
            <div key={t.id} className="border border-[var(--avd-border)] rounded-[var(--avd-radius-md)] overflow-hidden">
              {editingId === t.id ? (
                <div className="p-[14px] flex flex-col gap-[10px]">
                  {!t.is_system && (
                    <div className="avd-form-field">
                      <label className="avd-label">Nombre</label>
                      <input className="avd-input" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="avd-form-field">
                      <label className="avd-label">Seleccionadas</label>
                      <input className="avd-input" type="number" min={1} max={100} value={editForm.max_selected_candidates || ""} onChange={e => { const v = parseInt(e.target.value); setEditForm(p => ({ ...p, max_selected_candidates: isNaN(v) ? 0 : v })); }} />
                    </div>
                    <div className="avd-form-field">
                      <label className="avd-label">Votos/ronda</label>
                      <input className="avd-input" type="number" min={0} max={100} value={editForm.max_votes_per_round} onChange={e => { const v = parseInt(e.target.value); setEditForm(p => ({ ...p, max_votes_per_round: isNaN(v) ? 0 : v })); }} />
                    </div>
                    <div className="avd-form-field">
                      <label className="avd-label">Censo</label>
                      <select className="avd-select" value={editForm.census_mode} onChange={e => setEditForm(p => ({ ...p, census_mode: e.target.value as "maximum" | "exact" }))}>
                        <option value="maximum">Máximo</option>
                        <option value="exact">Exacto</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button className="avd-btn avd-btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                    <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={saveEdit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
                  </div>
                </div>
              ) : (
                <div className="px-[14px] py-3 flex items-center gap-[10px]">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[14px] text-[var(--avd-fg)]">{t.name}</span>
                      {t.is_system && <span className="avd-chip avd-chip-brand h-[18px] text-[10px] px-[7px]">Sistema</span>}
                    </div>
                    <span className="text-[12px] text-[var(--avd-fg-muted)]">
                      Seleccionar {t.max_selected_candidates} · Votos/ronda {t.max_votes_per_round || "auto"} · Censo {t.census_mode === "maximum" ? "máximo" : "exacto"}
                    </span>
                  </div>
                  {isSuperAdmin && (
                    <button
                      className={`avd-btn avd-btn-sm ${t.is_system ? "text-[var(--avd-fg-muted)]" : "text-[var(--avd-brand)]"}`}
                      onClick={() => toggleSystemType(t)}
                      title={t.is_system ? "Quitar del sistema (convertir a personalizado)" : "Promover a tipo del sistema"}
                    >
                      {t.is_system ? "← Personal." : "→ Sistema"}
                    </button>
                  )}
                  {(isSuperAdmin || !t.is_system) && (
                    <button className="avd-btn avd-btn-sm" onClick={() => startEdit(t)}>Editar</button>
                  )}
                  {!t.is_system && (
                    <button
                      className="avd-btn avd-btn-sm text-[var(--avd-bad)] border-[color-mix(in_oklch,var(--avd-bad)_30%,transparent)]"
                      onClick={() => setDeleteTarget(t)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Create new custom type */}
          <div className="border border-dashed border-[var(--avd-border)] rounded-[var(--avd-radius-md)] p-[14px]">
            <div className="text-[12px] font-bold uppercase tracking-[0.07em] text-[var(--avd-fg-subtle)] mb-[10px]">
              Nuevo tipo personalizado
            </div>
            <div className="grid grid-cols-4 gap-2 mb-[10px]">
              <div className="avd-form-field">
                <label className="avd-label">Nombre</label>
                <input className="avd-input" placeholder="Mi tipo" value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="avd-form-field">
                <label className="avd-label">Seleccionadas</label>
                <input className="avd-input" type="number" min={1} max={100} value={newForm.max_selected_candidates || ""} onChange={e => { const v = parseInt(e.target.value); setNewForm(p => ({ ...p, max_selected_candidates: isNaN(v) ? 0 : v })); }} />
              </div>
              <div className="avd-form-field">
                <label className="avd-label">Votos/ronda</label>
                <input className="avd-input" type="number" min={0} max={100} value={newForm.max_votes_per_round} onChange={e => { const v = parseInt(e.target.value); setNewForm(p => ({ ...p, max_votes_per_round: isNaN(v) ? 0 : v })); }} />
              </div>
              <div className="avd-form-field">
                <label className="avd-label">Censo</label>
                <select className="avd-select" value={newForm.census_mode} onChange={e => setNewForm(p => ({ ...p, census_mode: e.target.value as "maximum" | "exact" }))}>
                  <option value="maximum">Máximo</option>
                  <option value="exact">Exacto</option>
                </select>
              </div>
            </div>
            <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={createType} disabled={creating}>{creating ? "Creando..." : "Crear tipo"}</button>
          </div>
        </div>

        <div className="avd-dialog-foot">
          <button className="avd-btn avd-btn-sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="avd-dialog max-w-[380px]" onClick={e => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Eliminar tipo?</h2>
              <p>Las votaciones existentes que usen este tipo mantendrán su configuración guardada.</p>
            </div>
            <div className="avd-dialog-body">
              <div className="px-3 py-[10px] rounded-[var(--avd-radius-sm)] bg-[var(--avd-bad-bg)] border border-[color-mix(in_oklch,var(--avd-bad)_25%,transparent)] font-semibold text-[13px] text-[var(--avd-bad-fg)]">
                {deleteTarget.name}
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-danger" onClick={() => deleteType(deleteTarget)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
