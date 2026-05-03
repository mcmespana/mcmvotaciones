import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { CandidateListCard } from "@/components/voting/CandidateListCard";
import { CandidateDetailModal } from "@/components/voting/CandidateDetailModal";
import { useTheme } from "next-themes";
import type { RoundRow, CandidateRow } from "@/types/db";

/* ── Interfaces ── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Round = Pick<RoundRow, 'id' | 'title' | 'team' | 'public_candidates_enabled'>;
type Candidate = CandidateRow;

interface GroupEntry {
  groupKey: string;
  label: string;
  candidates: Candidate[];
}

/* ── Helpers ── */

function slugify(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeSearch(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function buildGroups(candidates: Candidate[]): GroupEntry[] {
  const byLocation = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const loc = c.location?.trim() || "Sin lugar asignado";
    const list = byLocation.get(loc) ?? [];
    list.push(c);
    byLocation.set(loc, list);
  }
  const sorted = [...byLocation.entries()].sort(([a], [b]) => {
    if (a === "Sin lugar asignado") return 1;
    if (b === "Sin lugar asignado") return -1;
    return a.localeCompare(b, "es");
  });
  return sorted.map(([loc, cs]) => ({
    groupKey: slugify(loc),
    label: loc,
    candidates: cs.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
  }));
}

/* ── Avatar ── */

const PALETTE     = ["#E53E3E","#3B82F6","#10B981","#F97316","#8B5CF6","#EC4899","#06B6D4","#EAB308"];
const PALETTE_LT  = ["#FED7D7","#DBEAFE","#D1FAE5","#FFEDD5","#EDE9FE","#FCE7F3","#CFFAFE","#FEF9C3"];

function PubAvatar({ name, surname, imageUrl }: { name: string; surname: string; imageUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const idx = ((name.charCodeAt(0) || 0) + (surname.charCodeAt(0) || 0)) % PALETTE.length;
  const bg = PALETTE_LT[idx], color = PALETTE[idx];
  const initials = `${(name[0] ?? "").toUpperCase()}${(surname[0] ?? "").toUpperCase()}`;

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={`${name} ${surname}`}
        onError={() => setFailed(true)}
        style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--avd-border)" }}
      />
    );
  }
  return (
    <div style={{ width: 46, height: 46, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 15, color, userSelect: "none" }}>
      {initials}
    </div>
  );
}

/* ── Component ── */

export function PublicCandidates() {
  const { votingId } = useParams<{ votingId: string }>();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [round, setRound] = useState<Round | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [indexOpen, setIndexOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const initializedRef = useRef(false);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!votingId) return;
    async function load() {
      try {
        const isUuid = UUID_RE.test(votingId!);
        const roundQuery = supabase
          .from("rounds")
          .select("id, title, team, public_candidates_enabled")
          .eq(isUuid ? "id" : "slug", votingId!);
        const { data: roundData } = await roundQuery.single();
        if (!roundData || !roundData.public_candidates_enabled) { setNotFound(true); return; }
        setRound(roundData);
        const { data: candidateData } = await supabase
          .from("candidates")
          .select("id, name, surname, location, group_name, age, description, image_url, order_index, asamblea_movimiento_es, asamblea_responsabilidad")
          .eq("round_id", roundData.id)
          .order("order_index");
        setCandidates(candidateData || []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [votingId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return candidates;
    const q = normalizeSearch(search);
    return candidates.filter((c) =>
      normalizeSearch(`${c.name} ${c.surname} ${c.location ?? ""} ${c.group_name ?? ""} ${c.description ?? ""}`).includes(q)
    );
  }, [candidates, search]);

  const groups = useMemo(() => buildGroups(filtered), [filtered]);

  /* Auto-open all groups on first data load */
  useEffect(() => {
    if (!initializedRef.current && groups.length > 0) {
      setOpenGroups(new Set(groups.map(g => g.groupKey)));
      initializedRef.current = true;
    }
  }, [groups]);

  function toggleGroup(key: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function scrollToGroup(key: string) {
    setOpenGroups(prev => { const next = new Set(prev); next.add(key); return next; });
    setIndexOpen(false);
    setTimeout(() => {
      const el = sectionRefs.current.get(key);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--avd-bg)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, border: "2.5px solid var(--avd-border)", borderTopColor: "var(--avd-brand)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--avd-fg-muted)", fontFamily: "var(--avd-font-sans)" }}>Cargando...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Not found ── */
  if (notFound || !round) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--avd-bg)", fontFamily: "var(--avd-font-sans)" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--avd-bg-elev)", border: "1px solid var(--avd-border)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--avd-fg-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--avd-fg)", marginBottom: 6 }}>Lista no disponible</div>
          <div style={{ fontSize: 13.5, color: "var(--avd-fg-muted)", lineHeight: 1.6 }}>Esta lista de candidatos no está visible públicamente o no existe.</div>
        </div>
      </div>
    );
  }

  const isDark = theme === "dark";

  /* ── Render ── */
  return (
    <div className="pub-page">
      <CandidateDetailModal candidate={detailCandidate} onClose={() => setDetailCandidate(null)} />

      {/* Title block (above sticky — not sticky itself) */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "20px 16px 6px", textAlign: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--avd-fg-muted)", marginBottom: 4 }}>{round.team}</div>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 900, letterSpacing: "-0.025em", color: "var(--avd-fg)", margin: 0 }}>{round.title}</h1>
        <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--avd-fg-muted)" }}>{filtered.length} candidatos · {groups.length} lugares</div>
      </div>

      {/* ─── Sticky header ─── */}
      <div className="pub-sticky">
        <div className="pub-sticky-card">

          {/* Search row */}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {/* Search */}
            <div style={{ flex: 1, position: "relative" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--avd-fg-faint)", pointerEvents: "none" }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input
                className="avd-input"
                style={{ paddingLeft: 32, paddingRight: search ? 32 : 12 }}
                placeholder="Buscar candidato..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--avd-fg-faint)", display: "flex" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                </button>
              )}
            </div>

            {/* Index toggle */}
            <button
              className="avd-btn avd-btn-icon"
              onClick={() => setIndexOpen(p => !p)}
              title={indexOpen ? "Ocultar índice" : "Mostrar índice de lugares"}
              style={{ flexShrink: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s", transform: indexOpen ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6"/></svg>
            </button>

            {/* Theme toggle */}
            {mounted && (
              <button
                className="avd-btn avd-btn-icon"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                style={{ flexShrink: 0 }}
              >
                {isDark
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                }
              </button>
            )}
          </div>

          {/* Index: location pills */}
          {indexOpen && groups.length > 0 && (
            <div className="pub-index">
              {groups.map(g => (
                <button key={g.groupKey} className="pub-index-pill" onClick={() => scrollToGroup(g.groupKey)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {g.label}
                  <span style={{ background: "var(--avd-bg-sunken)", border: "1px solid var(--avd-border-soft)", borderRadius: "999px", padding: "1px 6px", fontSize: 10, fontWeight: 700, color: "var(--avd-fg-muted)" }}>
                    {g.candidates.length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Content ─── */}
      <main className="pub-content">

        {/* Empty state */}
        {groups.length === 0 && (
          <div className="avd-empty" style={{ padding: "40px 0" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <p className="avd-empty-title">Sin resultados para «{search}»</p>
            <p className="avd-empty-sub">Prueba con otro nombre, lugar o grupo.</p>
          </div>
        )}

        {/* Groups */}
        {groups.map(group => {
          const isOpen = openGroups.has(group.groupKey);
          return (
            <div
              key={group.groupKey}
              className="pub-group"
              ref={el => { if (el) sectionRefs.current.set(group.groupKey, el); }}
            >
              {/* Accordion header */}
              <button className="pub-group-head" onClick={() => toggleGroup(group.groupKey)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--avd-fg)", flex: 1, textAlign: "left", letterSpacing: "-0.005em" }}>{group.label}</span>
                <span className="avd-chip" style={{ fontSize: 11 }}>{group.candidates.length}</span>
                <svg
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ flexShrink: 0, color: "var(--avd-fg-muted)", transition: "transform 0.18s", transform: isOpen ? "rotate(180deg)" : "none" }}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {/* Accordion body */}
              {isOpen && (
                <div className="pub-group-body">
                  <div className="pub-cand-grid">
                    {group.candidates.map((c) => (
                      <CandidateListCard
                        key={c.id}
                        candidate={c}
                        onClick={() => setDetailCandidate(c)}
                        onDetailView={setDetailCandidate}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
