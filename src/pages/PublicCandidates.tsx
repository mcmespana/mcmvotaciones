import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { CandidateListCard } from "@/components/voting/CandidateListCard";
import { CandidateDetailModal } from "@/components/voting/CandidateDetailModal";
import { useTheme } from "next-themes";
import type { RoundRow, CandidateRow } from "@/types/db";

/* ── Interfaces ── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Round = Pick<RoundRow, 'id' | 'title' | 'team' | 'description' | 'voting_type_name' | 'max_selected_candidates' | 'public_candidates_enabled'>;
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
        className="w-[46px] h-[46px] rounded-full object-cover shrink-0 border border-avd-border"
      />
    );
  }
  return (
    <div className="w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 font-extrabold text-[15px] select-none" style={{ background: bg, color }}>
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
          .select("id, title, team, description, voting_type_name, max_selected_candidates, public_candidates_enabled")
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
      <div className="min-h-screen flex items-center justify-center bg-avd-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-[2.5px] border-[var(--avd-border)] border-t-[var(--avd-brand)] animate-spin [animation-duration:0.7s]" />
          <span className="text-[13px] text-[var(--avd-fg-muted)] font-[var(--avd-font-sans)]">Cargando...</span>
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (notFound || !round) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-avd-bg font-avd-sans">
        <div className="text-center max-w-[360px]">
          <div className="w-14 h-14 rounded-full bg-[var(--avd-bg-elev)] border border-[var(--avd-border)] grid place-items-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--avd-fg-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="text-[18px] font-bold text-[var(--avd-fg)] mb-1.5">Lista no disponible</div>
          <div className="text-[13.5px] text-[var(--avd-fg-muted)] leading-relaxed">Esta lista de candidatos no está visible públicamente o no existe.</div>
        </div>
      </div>
    );
  }

  const NEXT_THEME: Record<string, string> = { light: "dark", dark: "system", system: "light" };
  const currentTheme = theme ?? "light";
  const nextTheme = NEXT_THEME[currentTheme] ?? "dark";

  const currentDetailIndex = detailCandidate ? filtered.findIndex((c) => c.id === detailCandidate.id) : -1;
  const handleNextCandidate = () => {
    if (currentDetailIndex === -1 || filtered.length <= 1) return;
    const nextIdx = (currentDetailIndex + 1) % filtered.length;
    setDetailCandidate(filtered[nextIdx]);
  };
  const handlePrevCandidate = () => {
    if (currentDetailIndex === -1 || filtered.length <= 1) return;
    const prevIdx = (currentDetailIndex - 1 + filtered.length) % filtered.length;
    setDetailCandidate(filtered[prevIdx]);
  };

  /* ── Render ── */
  return (
    <div className="pub-page">
      <CandidateDetailModal 
        candidate={detailCandidate} 
        onClose={() => setDetailCandidate(null)}
        onNext={handleNextCandidate}
        onPrev={handlePrevCandidate}
      />

      {/* Title block (above sticky — not sticky itself) */}
      <div className="max-w-[780px] mx-auto px-4 pt-5 pb-1.5 text-center">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--avd-fg-muted)] mb-1">{round.voting_type_name || round.team}</div>
        <h1 className="text-[clamp(20px,5vw,28px)] font-black tracking-[-0.025em] text-[var(--avd-fg)] m-0">{round.title}</h1>
        {round.description && <p className="mt-1.5 text-[12.5px] text-[var(--avd-fg-muted)] max-w-xl mx-auto">{round.description}</p>}
        <div className="mt-1.5 text-[12.5px] text-[var(--avd-fg-muted)]">{filtered.length} candidatos · {groups.length} lugares · {round.max_selected_candidates} a elegir</div>
      </div>

      {/* ─── Sticky header ─── */}
      <div className="pub-sticky">
        <div className="pub-sticky-card">

          {/* Search row */}
          <div className="flex items-center gap-[7px]">
            {/* Search */}
            <div className="flex-1 relative">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--avd-fg-faint)] pointer-events-none"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
              <input
                className={`avd-input h-[42px] !pl-[44px] text-[15px] ${search ? 'pr-[38px]' : 'pr-3'}`}
                placeholder="Buscar candidato..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 text-[var(--avd-fg-faint)] flex"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                </button>
              )}
            </div>

            {/* Index toggle */}
            <button
              className="avd-btn avd-btn-icon w-[42px] h-[42px] shrink-0"
              onClick={() => setIndexOpen(p => !p)}
              title={indexOpen ? "Ocultar índice" : "Mostrar índice de lugares"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200${indexOpen ? " rotate-180" : ""}`}><path d="M6 9l6 6 6-6"/></svg>
            </button>

            {/* Theme toggle: light → dark → system → light */}
            {mounted && (
              <button
                className="avd-btn avd-btn-icon w-[42px] h-[42px] shrink-0"
                onClick={() => setTheme(nextTheme)}
                title={
                  currentTheme === "light" ? "Cambiar a modo oscuro"
                  : currentTheme === "dark" ? "Cambiar a modo automático (dispositivo)"
                  : "Cambiar a modo claro"
                }
              >
                {currentTheme === "light"
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  : currentTheme === "dark"
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
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
                  <span className="bg-[var(--avd-bg-sunken)] border border-[var(--avd-border-soft)] rounded-full px-1.5 py-px text-[10px] font-bold text-[var(--avd-fg-muted)]">
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
          <div className="avd-empty py-10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="font-bold text-sm text-[var(--avd-fg)] flex-1 text-left tracking-[-0.005em]">{group.label}</span>
                <span className="avd-chip text-[11px]">{group.candidates.length}</span>
                <svg
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  className={`shrink-0 text-[var(--avd-fg-muted)] transition-transform duration-[180ms]${isOpen ? " rotate-180" : ""}`}
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
                        hideCheckbox={true}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>

    </div>
  );
}
