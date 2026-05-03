import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { generateAccessCode } from "@/lib/accessCode";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { VotingTypesManager, type VotingType } from "@/components/admin/VotingTypesManager";
import { TeamChip } from "@/components/admin/TeamChip";
import type { RoundRow } from "@/types/db";

type RoundListItem = Pick<RoundRow, 'id' | 'slug' | 'title' | 'description' | 'year' | 'team' | 'max_votantes' | 'is_active' | 'is_closed' | 'is_voting_open' | 'join_locked' | 'current_round_number' | 'votes_current_round' | 'created_at' | 'voting_type_name' | 'public_candidates_enabled' | 'show_final_gallery_projection'>;

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
  if (r.is_closed) return { cls: "avd-chip-bad", txt: "Cerrada" };
  if (r.is_active && r.is_voting_open) return { cls: "avd-chip-ok", txt: "En curso", pulse: true };
  if (r.is_active && !r.is_voting_open) return { cls: "avd-chip-warn", txt: "Sala abierta" };
  return { cls: "avd-chip-muted", txt: "En espera" };
}

function getAccentColor(r: RoundListItem) {
  if (r.is_closed) return "var(--avd-bad-500)";
  if (r.is_active && r.is_voting_open) return "var(--avd-ok-500)";
  if (r.is_active) return "var(--avd-warn-500)";
  return "var(--avd-border)";
}

interface RoundCardProps {
  round: RoundListItem;
  onOpen: (r: RoundListItem) => void;
  onDelete: (r: RoundListItem) => void;
  isSuperAdmin: boolean;
}

function RoundCard({ round, onOpen, onDelete, isSuperAdmin }: RoundCardProps) {
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
      <div style={{height:2.5, background:accentColor, opacity: round.is_closed || round.is_active ? 1 : 0.35}} />

      <div style={{padding:"14px 16px 12px", flex:1}}>
        {/* Header */}
        <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:10}}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:15, fontWeight:700, letterSpacing:"-0.01em", lineHeight:1.3, color:"var(--avd-fg)", marginBottom:6, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const}}>{round.title}</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:5, alignItems:"center"}}>
              <TeamChip label={round.voting_type_name || round.team} />
              <span className="avd-chip avd-chip-muted">{round.year}</span>
              <span className={`avd-chip ${chip.cls}`} style={{display:"flex", alignItems:"center", gap:5}}>
                {chip.pulse && <span className="avd-pulse-dot" />}
                {chip.txt}
              </span>
              {round.public_candidates_enabled && (
                <span className="avd-chip avd-chip-ok" style={{fontSize:10, height:18, display:'inline-flex', alignItems:'center', gap:3}}><Users size={9} /> Lista pública</span>
              )}
              {round.show_final_gallery_projection && (
                <span className="avd-chip avd-chip-brand" style={{fontSize:10, height:18, display:'inline-flex', alignItems:'center', gap:3}}><Image size={9} /> Galería activa</span>
              )}
            </div>
          </div>
          {isSuperAdmin && (
            <button
              className="avd-btn avd-btn-ghost avd-btn-icon-sm"
              onClick={e => { e.stopPropagation(); onDelete(round); }}
              title="Eliminar"
              style={{flexShrink:0, border:"none", color:"var(--avd-fg-faint)"}}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--avd-bad)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--avd-fg-faint)")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          )}
        </div>

        {round.description && (
          <p style={{fontSize:12.5, color:"var(--avd-fg-muted)", marginBottom:12, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, borderLeft:"2px solid var(--avd-border)", paddingLeft:10, margin:"0 0 12px"}}>{round.description}</p>
        )}

        {/* Metrics grid */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginTop:"auto"}}>
          {[
            { l: "Ronda", v: round.current_round_number, type: "n" },
            { l: "Cupo",  v: `${round.votes_current_round}/${round.max_votantes}`, type: "s" },
          ].map(m => (
            <div key={m.l} style={{padding:"8px 10px", borderRadius:"var(--avd-radius-sm)", background:"var(--avd-bg-sunken)", border:"1px solid var(--avd-border-soft)", textAlign:"center"}}>
              <div style={{fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--avd-fg-subtle)", marginBottom:4}}>{m.l}</div>
              <div style={{fontSize: m.type === "n" ? 18 : 14, fontWeight:700, fontVariantNumeric:"tabular-nums", color:"var(--avd-fg)", lineHeight:1}}>{m.v}</div>
            </div>
          ))}
          <div style={{padding:"8px 10px", borderRadius:"var(--avd-radius-sm)", background:"var(--avd-bg-sunken)", border:"1px solid var(--avd-border-soft)", textAlign:"center"}}>
            <div style={{fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--avd-fg-subtle)", marginBottom:4}}>Entrada</div>
            <span className={`avd-chip ${entryStatus.cls}`} style={{fontSize:11, height:20}}>{entryStatus.txt}</span>
          </div>
        </div>

        {/* Vote progress */}
        {round.is_active && (
          <div style={{marginTop:10}}>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--avd-fg-muted)", marginBottom:4, fontWeight:500}}>
              <span>Votos ronda {round.current_round_number}</span>
              <span style={{fontWeight:700, fontVariantNumeric:"tabular-nums", color:"var(--avd-fg)"}}>{votePct}%</span>
            </div>
            <div className="avd-meter" style={{height:4}}>
              <div className="avd-meter-fill avd-ok" style={{width:`${votePct}%`}} />
            </div>
          </div>
        )}
      </div>

      <div style={{padding:"10px 16px", borderTop:"1px solid var(--avd-border-soft)", background:"var(--avd-bg-sunken)"}}>
        <button className="avd-btn avd-btn-primary avd-btn-block" style={{height:36, fontSize:13, justifyContent:"center"}} onClick={() => onOpen(round)}>
          Gestionar votación
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
}

interface DeleteConfirmProps { round: RoundListItem | null; onClose: () => void; onConfirm: () => void; }

function DeleteConfirm({ round, onClose, onConfirm }: DeleteConfirmProps) {
  if (!round) return null;
  return (
    <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="avd-dialog" style={{maxWidth:420}} onClick={e => e.stopPropagation()}>
        <div className="avd-dialog-head"><h2>¿Eliminar votación?</h2><p>Esta acción no se puede deshacer. Se eliminarán todos los datos asociados.</p></div>
        <div className="avd-dialog-body">
          <div style={{padding:"12px 14px", borderRadius:"var(--avd-radius-sm)", background:"var(--avd-bad-bg)", border:"1px solid color-mix(in oklch, var(--avd-bad) 25%, transparent)", fontSize:13, fontWeight:600, color:"var(--avd-bad-fg)"}}>{round.title}</div>
        </div>
        <div className="avd-dialog-foot">
          <button className="avd-btn" onClick={onClose}>Cancelar</button>
          <button className="avd-btn avd-btn-danger" onClick={() => { onConfirm(); onClose(); }}>Eliminar votación</button>
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
  const [rounds, setRounds] = useState<RoundListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [view, setView] = useState<"grid" | "list">("list");
  const [loading, setLoading] = useState(true);
  const [creatingRound, setCreatingRound] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoundListItem | null>(null);
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
        .select("id,slug,title,description,year,team,max_votantes,is_active,is_closed,is_voting_open,join_locked,current_round_number,votes_current_round,created_at,voting_type_name,public_candidates_enabled,show_final_gallery_projection")
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
    let mounted = true;
    loadRounds();
    const channel = supabase
      .channel("admin-voting-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, () => { if (mounted) loadRounds(); })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [loadRounds]);

  const handleDeleteRound = async (id: string, title: string) => {
    try {
      const { error } = await supabase.from('rounds').delete().eq('id', id);
      if (error) throw error;
      setRounds(rs => rs.filter(r => r.id !== id));
      toast({ title: "Votación eliminada", description: `"${title}" eliminada.` });
    } catch (err) {
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

  const filteredRounds = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return rounds.filter(r =>
      (!q || r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q)) &&
      (teamFilter === "ALL" || r.team === teamFilter)
    );
  }, [rounds, searchTerm, teamFilter]);

  if (loading) {
    return (
      <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:40, background:"var(--avd-bg)"}}>
        <div style={{width:28, height:28, border:"2px solid var(--avd-border)", borderTopColor:"var(--avd-brand)", borderRadius:"50%", animation:"spin 0.7s linear infinite"}} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{flex:1, display:"flex", flexDirection:"column", background:"var(--avd-bg)", fontFamily:"var(--avd-font-sans)"}}>
      {/* Toolbar */}
      <div className="adm-toolbar">
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--avd-fg-subtle)"}}>Votaciones</span>
          <span className="avd-chip avd-chip-brand">{totalActive} activas</span>
          <span className="avd-chip avd-chip-muted">{rounds.length} total</span>
        </div>
        <div style={{flex:1}} />
        {/* Search */}
        <div className="avd-search-wrap" style={{width:200}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input className="avd-input" style={{paddingLeft:30}} placeholder="Buscar votación..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        {/* Team filter */}
        <div className="avd-segmented">
          {["ALL", "ECE", "ECL"].map(t => (
            <button key={t} className={teamFilter === t ? "active" : ""} onClick={() => setTeamFilter(t)}>
              {t === "ALL" ? "Todos" : t}
            </button>
          ))}
        </div>
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
      <div className="adm-scroll" style={{flex:1, padding:20}}>
        {filteredRounds.length === 0 ? (
          <div className="avd-empty" style={{paddingTop:80}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.3}}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <p className="avd-empty-title">Sin votaciones</p>
            <p className="avd-empty-sub">Crea una nueva votación para comenzar.</p>
          </div>
        ) : view === "grid" ? (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:14}}>
            {filteredRounds.map(r => (
              <RoundCard key={r.id} round={r} onOpen={r => navigate(`/admin/votaciones/${r.id}`)} onDelete={setDeleteTarget} isSuperAdmin={isSuperAdmin} />
            ))}
          </div>
        ) : (
          <div style={{background:"var(--avd-surface)", border:"1px solid var(--avd-border)", borderRadius:"var(--avd-radius-md)", overflow:"hidden"}}>
            <div style={{display:"grid", gridTemplateColumns: isSuperAdmin ? "1fr 90px 90px 110px 110px 100px 40px" : "1fr 90px 90px 110px 110px 100px", padding:"8px 14px", background:"var(--avd-bg-sunken)", fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--avd-fg-subtle)", gap:12, alignItems:"center"}}>
              <div>Votación</div><div>Ronda</div><div>Cupo</div><div>Estado</div><div>Vistas</div><div>Tipo</div>{isSuperAdmin && <div></div>}
            </div>
            {filteredRounds.map(r => {
              const chip = getStatusChip(r);
              return (
                <div
                  key={r.id}
                  style={{display:"grid", gridTemplateColumns: isSuperAdmin ? "1fr 90px 90px 110px 110px 100px 40px" : "1fr 90px 90px 110px 110px 100px", padding:"11px 14px", borderTop:"1px solid var(--avd-border-soft)", alignItems:"center", gap:12, fontSize:13, cursor:"pointer", transition:"background 0.12s"}}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--avd-bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  onClick={() => navigate(`/admin/votaciones/${r.id}`)}
                >
                  <div style={{minWidth:0, overflow:"hidden"}}>
                    <div style={{fontWeight:600, letterSpacing:"-0.005em", color:"var(--avd-fg)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis"}}>{r.title}</div>
                    {r.description && <div style={{fontSize:11.5, color:"var(--avd-fg-muted)", marginTop:2, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis"}}>{r.description}</div>}
                  </div>
                  <div style={{fontWeight:700, fontVariantNumeric:"tabular-nums", color:"var(--avd-fg)"}}>{r.current_round_number}</div>
                  <div style={{fontWeight:600, fontVariantNumeric:"tabular-nums", color:"var(--avd-fg)"}}>{r.votes_current_round}/{r.max_votantes}</div>
                  <div style={{display:"flex", flexDirection:"column", gap:3}}>
                    <span className={`avd-chip ${chip.cls}`} style={{display:"flex", alignItems:"center", gap:5, width:"fit-content"}}>{chip.pulse && <span className="avd-pulse-dot" />}{chip.txt}</span>
                  </div>
                  <div style={{display:"flex", flexDirection:"column", gap:3}}>
                    {r.public_candidates_enabled && <span className="avd-chip avd-chip-ok" style={{fontSize:10, height:18, width:"fit-content", display:'inline-flex', alignItems:'center', gap:3}}><Users size={9} /> Lista pública</span>}
                    {r.show_final_gallery_projection && <span className="avd-chip avd-chip-brand" style={{fontSize:10, height:18, width:"fit-content", display:'inline-flex', alignItems:'center', gap:3}}><Image size={9} /> Galería activa</span>}
                  </div>
                  <div>
                    <TeamChip label={r.voting_type_name || r.team} />
                  </div>
                  {isSuperAdmin && (
                    <div style={{display:"flex", justifyContent:"center"}}>
                      <button
                        className="avd-btn avd-btn-ghost avd-btn-icon-sm"
                        onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                        title="Eliminar"
                        style={{border:"none", color:"var(--avd-fg-faint)"}}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--avd-bad)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--avd-fg-faint)")}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      {createOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCreateOpen(false); }}>
          <div className="avd-dialog" onClick={e => e.stopPropagation()}>
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
                <div className="avd-form-grid avd-form-grid-2">
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
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
                    <p style={{ fontSize: 11, color: "var(--avd-fg-faint)", marginTop: 2 }}>0 = auto (máx. 3)</p>
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

    </div>
  );
}
