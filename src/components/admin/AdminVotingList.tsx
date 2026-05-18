import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { Users, Image } from "lucide-react";
import { errorLog } from "@/lib/logger";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { generateAccessCode } from "@/lib/accessCode";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { VotingTypesManager, type VotingType } from "@/components/admin/VotingTypesManager";
import { TeamChip } from "@/components/admin/TeamChip";
import { DuplicateVotingModal } from "@/components/admin/DuplicateVotingModal";
import type { RoundRow } from "@/types/db";

type RoundListItem = Pick<RoundRow, 'id' | 'slug' | 'title' | 'description' | 'year' | 'team' | 'max_votantes' | 'is_active' | 'is_closed' | 'is_archived' | 'is_voting_open' | 'join_locked' | 'current_round_number' | 'votes_current_round' | 'created_at' | 'voting_type_name' | 'public_candidates_enabled' | 'show_final_gallery_projection'>;

type StatusFilter = 'live' | 'all' | 'archived' | 'draft' | 'finished';

function generateSlug(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${id.replace(/-/g, "").slice(0, 6)}`;
}

interface NewRoundForm {
  title: string;
  description: string;
  year: number;
  team: "ECE" | "ECL";
  max_votantes: number;
  census_mode: "maximum" | "exact";
  voting_type_id: string | null;
  voting_type_name: string;
  max_selected_candidates: number;
  max_votes_per_round: number;
}

function getStatusChip(r: RoundListItem) {
  if (r.is_archived) return { cls: "avd-chip-muted", txt: "Archivada" };
  if (r.is_closed) return { cls: "avd-chip-bad", txt: "Finalizada" };
  if (r.is_active && r.is_voting_open) return { cls: "avd-chip-ok", txt: "En curso", pulse: true };
  if (r.is_active && !r.is_voting_open) return { cls: "avd-chip-warn", txt: "Sala abierta" };
  return { cls: "avd-chip-muted", txt: "Borrador" };
}

function getAccentColor(r: RoundListItem) {
  if (r.is_archived) return "var(--avd-border)";
  if (r.is_closed) return "var(--avd-bad-500)";
  if (r.is_active && r.is_voting_open) return "var(--avd-ok-500)";
  if (r.is_active) return "var(--avd-warn-500)";
  return "var(--avd-border)";
}

interface RoundCardProps {
  round: RoundListItem;
  onOpen: (r: RoundListItem) => void;
  onDelete: (r: RoundListItem) => void;
  onArchive: (r: RoundListItem, archived: boolean) => void;
  onDuplicate: (r: RoundListItem) => void;
  isSuperAdmin: boolean;
}

function RoundCard({ round, onOpen, onDelete, onArchive, onDuplicate, isSuperAdmin }: RoundCardProps) {
  const chip = getStatusChip(round);
  const votePct = round.max_votantes > 0 ? Math.round((round.votes_current_round / round.max_votantes) * 100) : 0;
  const accentColor = getAccentColor(round);

  const entryStatus = !round.is_active && !round.is_closed
    ? { cls: "", txt: "En espera" }
    : (round.join_locked || round.is_closed)
      ? { cls: "avd-chip-bad", txt: "Cerrada" }
      : { cls: "avd-chip-ok", txt: "Abierta" };

  return (
    <div className="adm-round-card">
      <div className={`h-[2.5px] ${round.is_closed || round.is_active ? 'opacity-100' : 'opacity-35'}`} style={{background:accentColor}} />

      <div className="px-4 pt-[14px] pb-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-[10px] mb-[10px]">
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold tracking-[-0.01em] leading-[1.3] text-[var(--avd-fg)] mb-1.5 line-clamp-2">{round.title}</div>
            <div className="flex flex-wrap gap-[5px] items-center">
              <TeamChip label={round.voting_type_name || round.team} />
              <span className="avd-chip avd-chip-muted">{round.year}</span>
              <span className={`avd-chip ${chip.cls} flex items-center gap-[5px]`}>
                {chip.pulse && <span className="avd-pulse-dot" />}
                {chip.txt}
              </span>
              {round.public_candidates_enabled && (
                <span className="avd-chip avd-chip-ok text-[10px] h-[18px] inline-flex items-center gap-[3px]"><Users size={9} /> Lista pública</span>
              )}
              {round.show_final_gallery_projection && (
                <span className="avd-chip avd-chip-brand text-[10px] h-[18px] inline-flex items-center gap-[3px]"><Image size={9} /> Galería activa</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="avd-btn avd-btn-ghost avd-btn-icon-sm border-none text-[var(--avd-fg-faint)]"
              onClick={e => { e.stopPropagation(); onDuplicate(round); }}
              title="Duplicar votación"
              onMouseEnter={e => (e.currentTarget.style.color = "var(--avd-brand)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--avd-fg-faint)")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button
              className="avd-btn avd-btn-ghost avd-btn-icon-sm border-none text-[var(--avd-fg-faint)]"
              onClick={e => { e.stopPropagation(); onArchive(round, !round.is_archived); }}
              title={round.is_archived ? "Restaurar" : "Archivar"}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--avd-warn)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--avd-fg-faint)")}
            >
              {round.is_archived
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              }
            </button>
            {isSuperAdmin && (
              <button
                className="avd-btn avd-btn-ghost avd-btn-icon-sm border-none text-[var(--avd-fg-faint)]"
                onClick={e => { e.stopPropagation(); onDelete(round); }}
                title="Eliminar permanentemente"
                onMouseEnter={e => (e.currentTarget.style.color = "var(--avd-bad)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--avd-fg-faint)")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            )}
          </div>
        </div>

        {round.description && (
          <p className="text-[12.5px] text-[var(--avd-fg-muted)] mb-3 leading-[1.5] line-clamp-2 border-l-2 border-[var(--avd-border)] pl-[10px]">{round.description}</p>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-1.5 mt-auto">
          {[
            { l: "Ronda", v: round.current_round_number, type: "n" },
            { l: "Cupo",  v: `${round.votes_current_round}/${round.max_votantes}`, type: "s" },
          ].map(m => (
            <div key={m.l} className="px-[10px] py-2 rounded-[var(--avd-radius-sm)] bg-[var(--avd-bg-sunken)] border border-[var(--avd-border-soft)] text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--avd-fg-subtle)] mb-1">{m.l}</div>
              <div className={`font-bold tabular-nums text-[var(--avd-fg)] leading-none ${m.type === "n" ? "text-[18px]" : "text-[14px]"}`}>{m.v}</div>
            </div>
          ))}
          <div className="px-[10px] py-2 rounded-[var(--avd-radius-sm)] bg-[var(--avd-bg-sunken)] border border-[var(--avd-border-soft)] text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--avd-fg-subtle)] mb-1">Entrada</div>
            <span className={`avd-chip ${entryStatus.cls} text-[11px] h-5`}>{entryStatus.txt}</span>
          </div>
        </div>

        {/* Vote progress */}
        {round.is_active && (
          <div className="mt-[10px]">
            <div className="flex justify-between text-[11px] text-[var(--avd-fg-muted)] mb-1 font-medium">
              <span>Votos ronda {round.current_round_number}</span>
              <span className="font-bold tabular-nums text-[var(--avd-fg)]">{votePct}%</span>
            </div>
            <div className="avd-meter h-1">
              <div className="avd-meter-fill avd-ok" style={{width:`${votePct}%`}} />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-[10px] border-t border-[var(--avd-border-soft)] bg-[var(--avd-bg-sunken)]">
        <button className="avd-btn avd-btn-primary avd-btn-block h-9 text-[13px] justify-center" onClick={() => onOpen(round)}>
          Gestionar votación
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
}

interface DeleteConfirmProps { round: RoundListItem | null; onClose: () => void; onConfirm: () => void; }

function DeleteConfirm({ round, onClose, onConfirm }: DeleteConfirmProps) {
  const [typed, setTyped] = useState("");
  const inputId = useId();

  useEffect(() => { if (!round) setTyped(""); }, [round]);

  if (!round) return null;
  const confirmed = typed === round.title;

  return (
    <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="avd-dialog max-w-[440px]" onClick={e => e.stopPropagation()}>
        <div className="avd-dialog-head">
          <h2>Eliminar votación</h2>
          <p>Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos los datos, votos y candidatos asociados.</p>
        </div>
        <div className="avd-dialog-body flex flex-col gap-3">
          <div className="px-[14px] py-3 rounded-[var(--avd-radius-sm)] bg-[var(--avd-bad-bg)] border border-[color-mix(in_oklch,var(--avd-bad)_25%,transparent)] text-[13px] font-semibold text-[var(--avd-bad-fg)]">{round.title}</div>
          <div className="avd-form-field">
            <label className="avd-label" htmlFor={inputId}>Escribe el nombre exacto para confirmar</label>
            <input
              id={inputId}
              className="avd-input"
              placeholder={round.title}
              value={typed}
              onChange={e => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="avd-dialog-foot">
          <button className="avd-btn" onClick={onClose}>Cancelar</button>
          <button
            className="avd-btn avd-btn-danger"
            disabled={!confirmed}
            onClick={() => { onConfirm(); onClose(); }}
          >
            Eliminar permanentemente
          </button>
        </div>
      </div>
    </div>
  );
}

interface AdminVotingListProps {
  refreshTypesKey?: number;
}

export function AdminVotingList({ refreshTypesKey }: AdminVotingListProps = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const channelUid = useRef(crypto.randomUUID()).current;
  const [rounds, setRounds] = useState<RoundListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("live");
  const [view, setView] = useState<"grid" | "list">("list");
  const [loading, setLoading] = useState(true);
  const [creatingRound, setCreatingRound] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoundListItem | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<RoundListItem | null>(null);
  const [votingTypes, setVotingTypes] = useState<VotingType[]>([]);
  const [form, setForm] = useState<NewRoundForm>({ title: "", description: "", year: new Date().getFullYear(), team: "ECE", max_votantes: 100, census_mode: "maximum", voting_type_id: null, voting_type_name: "", max_selected_candidates: 1, max_votes_per_round: 0 });

  const loadVotingTypes = useCallback(async () => {
    const { data } = await supabase.from("voting_types").select("*").order("is_system", { ascending: false }).order("name");
    setVotingTypes((data || []) as VotingType[]);
  }, []);

  useEffect(() => { loadVotingTypes(); }, [loadVotingTypes]);
  useEffect(() => { if (refreshTypesKey) loadVotingTypes(); }, [refreshTypesKey, loadVotingTypes]);

  const applyVotingType = (typeId: string | null) => {
    if (!typeId) {
      setForm(p => ({ ...p, voting_type_id: null, voting_type_name: "" }));
      return;
    }
    const t = votingTypes.find(vt => vt.id === typeId);
    if (!t) return;
    const team: "ECE" | "ECL" = t.name === "ECL" ? "ECL" : "ECE";
    setForm(p => ({ ...p, voting_type_id: t.id, voting_type_name: t.name, team, max_selected_candidates: t.max_selected_candidates, max_votes_per_round: t.max_votes_per_round, census_mode: t.census_mode }));
  };

  const loadRounds = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("rounds")
        .select("id,slug,title,description,year,team,max_votantes,is_active,is_closed,is_archived,is_voting_open,join_locked,current_round_number,votes_current_round,created_at,voting_type_name,public_candidates_enabled,show_final_gallery_projection")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRounds((data || []) as RoundListItem[]);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la lista de votaciones", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setView("grid"); };
    if (mq.matches) setView("grid");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadRounds();
    const channel = supabase
      .channel(`admin-voting-list-${channelUid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, () => { if (mounted) loadRounds(); })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [loadRounds]);

  const handleArchiveRound = async (round: RoundListItem, archived: boolean) => {
    try {
      const { error } = await supabase
        .from('rounds')
        .update({ is_archived: archived, archived_at: archived ? new Date().toISOString() : null })
        .eq('id', round.id);
      if (error) throw error;
      setRounds(rs => rs.map(r => r.id === round.id ? { ...r, is_archived: archived } : r));
      toast({ title: archived ? "Votación archivada" : "Votación restaurada", description: round.title });
    } catch (err) {
      errorLog("Error archivando round:", err);
      const msg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err ? String((err as {message:unknown}).message) : "Error desconocido");
      toast({ title: "Error", description: msg || "No se pudo archivar la votación.", variant: "destructive" });
    }
  };

  const handleDeleteRound = async (id: string, title: string) => {
    try {
      const { data: files } = await supabase.storage.from('candidate-photos').list(id);
      if (files && files.length > 0) {
        await supabase.storage.from('candidate-photos').remove(files.map(f => `${id}/${f.name}`));
      }
      const { error } = await supabase.from('rounds').delete().eq('id', id);
      if (error) throw error;
      setRounds(rs => rs.filter(r => r.id !== id));
      toast({ title: "Votación eliminada", description: `"${title}" eliminada permanentemente.` });
    } catch (err) {
      errorLog("Error eliminando voting round:", err);
      toast({ title: "Error al eliminar", description: err instanceof Error ? err.message : "No se pudo eliminar.", variant: "destructive" });
    }
  };

  const createRound = async () => {
    const title = form.title.trim();
    if (!title) { toast({ title: "Título obligatorio", description: "Debes indicar el nombre de la votación.", variant: "destructive" }); return; }
    const generatedAccessCode = generateAccessCode();
    try {
      setCreatingRound(true);
      const derivedTeam: "ECE" | "ECL" = form.voting_type_name === "ECL" ? "ECL" : "ECE";
      const { data: inserted, error } = await supabase.from("rounds").insert([{
        title, description: form.description.trim() || null,
        year: form.year, team: derivedTeam, max_votantes: form.max_votantes,
        access_code: generatedAccessCode, census_mode: form.census_mode, is_active: false,
        voting_type_id: form.voting_type_id || null,
        voting_type_name: form.voting_type_name || null,
        max_selected_candidates: form.max_selected_candidates,
        max_votes_per_round: form.max_votes_per_round,
      }]).select("id").single();
      if (error) throw error;
      if (inserted?.id) {
        await supabase.from("rounds").update({ slug: generateSlug(title, inserted.id) }).eq("id", inserted.id);
      }
      toast({ title: "Votación creada", description: `Código de acceso: ${generatedAccessCode}` });
      setCreateOpen(false);
      setForm({ title: "", description: "", year: new Date().getFullYear(), team: "ECE", max_votantes: 100, census_mode: "maximum", voting_type_id: null, voting_type_name: "", max_selected_candidates: 1, max_votes_per_round: 0 });
      await loadRounds();
    } catch {
      toast({ title: "Error", description: "No se pudo crear la votación.", variant: "destructive" });
    } finally {
      setCreatingRound(false);
    }
  };

  const totalActive = useMemo(() => rounds.filter(r => r.is_active && !r.is_closed).length, [rounds]);

  const systemTypeNames = useMemo(
    () => new Set(votingTypes.filter(t => t.is_system).map(t => t.name)),
    [votingTypes],
  );
  const hasCustomTypes = useMemo(
    () => rounds.some(r => r.voting_type_name && !systemTypeNames.has(r.voting_type_name)),
    [rounds, systemTypeNames],
  );

  const filteredRounds = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return rounds.filter(r => {
      const matchesSearch = !q || r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
      const typeName = r.voting_type_name || "";
      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "CUSTOM" ? !systemTypeNames.has(typeName) : typeName === typeFilter);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "live"     && !r.is_archived) ||
        (statusFilter === "archived" && r.is_archived) ||
        (statusFilter === "draft"    && !r.is_active && !r.is_closed && !r.is_archived) ||
        (statusFilter === "finished" && r.is_closed && !r.is_archived);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rounds, searchTerm, typeFilter, statusFilter, systemTypeNames]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 bg-[var(--avd-bg)]">
        <div className="w-7 h-7 border-2 border-[var(--avd-border)] border-t-[var(--avd-brand)] rounded-full animate-spin [animation-duration:0.7s]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--avd-bg)] font-[var(--avd-font-sans)]">
      {/* Toolbar */}
      <div className="adm-toolbar">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--avd-fg-subtle)]">Votaciones</span>
          <span className="avd-chip avd-chip-brand">{totalActive} activas</span>
          <span className="avd-chip avd-chip-muted">{rounds.length} total</span>
        </div>
        <div className="flex-1" />
        {/* Search */}
        <div className="avd-search-wrap w-full sm:w-[200px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input className="avd-input pl-[30px]" placeholder="Buscar votación..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        {/* Status filter */}
        <select
          className="avd-select"
          style={{ height: 30, fontSize: 12, padding: "0 24px 0 8px", minWidth: 0, width: "auto" }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="live">Activas</option>
          <option value="draft">Borradores</option>
          <option value="finished">Finalizadas</option>
          <option value="archived">Archivadas</option>
          <option value="all">Todas</option>
        </select>
        {/* Type filter */}
        <select
          className="avd-select"
          style={{ height: 30, fontSize: 12, padding: "0 24px 0 8px", minWidth: 0, width: "auto" }}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="ALL">Todos</option>
          {Array.from(systemTypeNames).sort().map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
          {hasCustomTypes && <option value="CUSTOM">Personalizado</option>}
        </select>
        {/* View toggle */}
        <div className="avd-segmented">
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Lista
          </button>
          <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Tarjetas
          </button>
        </div>
        <button className="avd-btn avd-btn-primary avd-btn-sm" onClick={() => { loadVotingTypes(); setCreateOpen(true); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Crear votación
        </button>
      </div>

      {/* Content */}
      <div className="adm-scroll flex-1 p-5">
        {filteredRounds.length === 0 ? (
          <div className="avd-empty pt-20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <p className="avd-empty-title">Sin votaciones</p>
            <p className="avd-empty-sub">Crea una nueva votación para comenzar.</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-[14px] [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
            {filteredRounds.map(r => (
              <RoundCard key={r.id} round={r} onOpen={r => navigate(`/admin/votaciones/${r.id}`)} onDelete={setDeleteTarget} onArchive={handleArchiveRound} onDuplicate={setDuplicateTarget} isSuperAdmin={isSuperAdmin} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-md)] overflow-hidden min-w-[720px]">
            <div className={`px-[14px] py-2 bg-[var(--avd-bg-sunken)] text-[10.5px] font-bold uppercase tracking-[0.07em] text-[var(--avd-fg-subtle)] grid gap-3 items-center ${isSuperAdmin ? '[grid-template-columns:1fr_90px_90px_110px_110px_100px_64px]' : '[grid-template-columns:1fr_90px_90px_110px_110px_100px_32px]'}`}>
              <div>Votación</div><div>Ronda</div><div>Cupo</div><div>Estado</div><div>Vistas</div><div>Tipo</div><div></div>
            </div>
            {filteredRounds.map(r => {
              const chip = getStatusChip(r);
              return (
                <div
                  key={r.id}
                  className={`px-[14px] py-[11px] border-t border-[var(--avd-border-soft)] items-center grid gap-3 text-[13px] cursor-pointer transition-[background] duration-[0.12s] ${isSuperAdmin ? '[grid-template-columns:1fr_90px_90px_110px_110px_100px_64px]' : '[grid-template-columns:1fr_90px_90px_110px_110px_100px_32px]'}`}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--avd-bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  onClick={() => navigate(`/admin/votaciones/${r.id}`)}
                >
                  <div className="min-w-0 overflow-hidden">
                    <div className="font-semibold tracking-[-0.005em] text-[var(--avd-fg)] truncate">{r.title}</div>
                    {r.description && <div className="text-[11.5px] text-[var(--avd-fg-muted)] mt-0.5 truncate">{r.description}</div>}
                  </div>
                  <div className="font-bold tabular-nums text-[var(--avd-fg)]">{r.current_round_number}</div>
                  <div className="font-semibold tabular-nums text-[var(--avd-fg)]">{r.votes_current_round}/{r.max_votantes}</div>
                  <div className="flex flex-col gap-[3px]">
                    <span className={`avd-chip ${chip.cls} flex items-center gap-[5px] w-fit`}>{chip.pulse && <span className="avd-pulse-dot" />}{chip.txt}</span>
                  </div>
                  <div className="flex flex-col gap-[3px]">
                    {r.public_candidates_enabled && <span className="avd-chip avd-chip-ok text-[10px] h-[18px] w-fit inline-flex items-center gap-[3px]"><Users size={9} /> Lista pública</span>}
                    {r.show_final_gallery_projection && <span className="avd-chip avd-chip-brand text-[10px] h-[18px] w-fit inline-flex items-center gap-[3px]"><Image size={9} /> Galería activa</span>}
                  </div>
                  <div>
                    <TeamChip label={r.voting_type_name || r.team} />
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="avd-btn avd-btn-ghost avd-btn-icon-sm border-none text-[var(--avd-fg-faint)]"
                      onClick={e => { e.stopPropagation(); setDuplicateTarget(r); }}
                      title="Duplicar votación"
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--avd-brand)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--avd-fg-faint)")}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button
                      className="avd-btn avd-btn-ghost avd-btn-icon-sm border-none text-[var(--avd-fg-faint)]"
                      onClick={e => { e.stopPropagation(); handleArchiveRound(r, !r.is_archived); }}
                      title={r.is_archived ? "Restaurar" : "Archivar"}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--avd-warn)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--avd-fg-faint)")}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                    </button>
                    {isSuperAdmin && (
                      <button
                        className="avd-btn avd-btn-ghost avd-btn-icon-sm border-none text-[var(--avd-fg-faint)]"
                        onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                        title="Eliminar permanentemente"
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--avd-bad)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--avd-fg-faint)")}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {createOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCreateOpen(false); }}>
          <div className="avd-dialog max-w-[90vw] sm:max-w-[560px]" onClick={e => e.stopPropagation()}>
            <div className="avd-dialog-head"><h2>Nueva votación</h2><p>Crea una votación sin salir de la lista.</p></div>
            <div className="avd-dialog-body">
              <div className="avd-form-grid">
                <div className="avd-form-field">
                  <label className="avd-label">Título</label>
                  <input className="avd-input" placeholder="Elecciones ECE 2026" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
                </div>
                <div className="avd-form-field">
                  <label className="avd-label">Descripción</label>
                  <textarea className="avd-textarea" placeholder="Contexto de la votación" rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
                </div>
                <div className="avd-form-grid avd-form-grid-2 grid grid-cols-1 md:grid-cols-2">
                  <div className="avd-form-field">
                    <label className="avd-label">Año</label>
                    <input className="avd-input" type="number" value={form.year} onChange={e => setForm(p => ({...p, year: parseInt(e.target.value) || new Date().getFullYear()}))} />
                  </div>
                  <div className="avd-form-field">
                    <label className="avd-label">Cupo máximo</label>
                    <input className="avd-input" type="number" min={1} value={form.max_votantes} onChange={e => setForm(p => ({...p, max_votantes: parseInt(e.target.value) || 1}))} />
                  </div>
                </div>
                {/* Voting type selector */}
                <div className="avd-form-field">
                  <label className="avd-label">Tipo de votación</label>
                  <select
                    className="avd-select"
                    value={form.voting_type_id ?? "custom"}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setForm(p => ({ ...p, voting_type_id: null, voting_type_name: "" }));
                      } else {
                        applyVotingType(val);
                      }
                    }}
                  >
                    <option value="custom">Personalizado</option>
                    {votingTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}{t.is_system ? "" : " (personalizado)"}</option>
                    ))}
                  </select>
                </div>

                {/* Config fields — shown always, pre-filled from type */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="avd-form-field">
                    <label className="avd-label">Total seleccionadas</label>
                    <input className="avd-input" type="number" min={1} max={100}
                      value={form.max_selected_candidates || ""}
                      onChange={e => { const v = parseInt(e.target.value); setForm(p => ({ ...p, max_selected_candidates: isNaN(v) ? 0 : v, voting_type_id: null, voting_type_name: "" })); }}
                    />
                  </div>
                  <div className="avd-form-field">
                    <label className="avd-label">Votos / ronda</label>
                    <input className="avd-input" type="number" min={0} max={100}
                      value={form.max_votes_per_round}
                      onChange={e => setForm(p => ({ ...p, max_votes_per_round: Math.max(0, parseInt(e.target.value) || 0), voting_type_id: null, voting_type_name: "" }))}
                    />
                    <p className="text-[11px] text-[var(--avd-fg-faint)] mt-0.5">0 = auto (máx. 3)</p>
                  </div>
                  <div className="avd-form-field">
                    <label className="avd-label">Modo censo</label>
                    <select className="avd-select" value={form.census_mode}
                      onChange={e => setForm(p => ({ ...p, census_mode: e.target.value as "maximum" | "exact", voting_type_id: null, voting_type_name: "" }))}>
                      <option value="maximum">Máximo</option>
                      <option value="exact">Exacto</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn" onClick={() => setCreateOpen(false)} disabled={creatingRound}>Cancelar</button>
              <button className="avd-btn avd-btn-primary" onClick={createRound} disabled={creatingRound}>
                {creatingRound ? "Creando..." : "Crear votación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <DeleteConfirm
        round={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) handleDeleteRound(deleteTarget.id, deleteTarget.title); }}
      />

      {/* Duplicate modal */}
      <DuplicateVotingModal
        source={duplicateTarget}
        onClose={() => setDuplicateTarget(null)}
      />

    </div>
  );
}
