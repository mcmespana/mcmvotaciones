import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { CandidateAvatar } from "@/components/CandidateAvatar";
import { formatCandidateName } from "@/lib/candidateFormat";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChevronDown, ChevronUp, MapPin, Search, Tag, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Round {
  id: string;
  title: string;
  team: string;
  public_candidates_enabled: boolean;
}

interface Candidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  group_name: string | null;
  age: number | null;
  description: string | null;
  image_url: string | null;
  order_index: number;
}

interface GroupEntry {
  groupKey: string;
  label: string;
  candidates: Candidate[];
}

function slugify(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeSearch(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

export function PublicCandidates() {
  const { votingId } = useParams<{ votingId: string }>();
  const [round, setRound] = useState<Round | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [indexOpen, setIndexOpen] = useState(true);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!votingId) return;

    async function load() {
      try {
        const { data: roundData } = await supabase
          .from("rounds")
          .select("id, title, team, public_candidates_enabled")
          .eq("id", votingId!)
          .single();

        if (!roundData || !roundData.public_candidates_enabled) {
          setNotFound(true);
          return;
        }

        setRound(roundData);

        const { data: candidateData } = await supabase
          .from("candidates")
          .select("id, name, surname, location, group_name, age, description, image_url, order_index")
          .eq("round_id", votingId!)
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

  const scrollTo = (key: string) => {
    const el = sectionRefs.current.get(key);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !round) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-2xl font-bold text-muted-foreground mb-2">Lista no disponible</p>
          <p className="text-sm text-muted-foreground">Esta lista de candidatos no está visible públicamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-4">
      <ThemeToggle mode="floating" />

      {/* ── Title ── */}
      <div className="max-w-4xl mx-auto px-4 mb-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{round.team}</p>
        <h1 className="text-2xl font-headline font-black tracking-tight">{round.title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} candidatos</p>
      </div>

      {/* ── Sticky header (matches voting page style) ── */}
      <div className="sticky top-2 z-30 mx-4 max-w-4xl md:mx-auto">
        <div className="rounded-[1.6rem] border border-outline-variant/55 bg-surface-container-lowest p-2.5 shadow-tech dark:border-outline-variant/70 dark:bg-surface-container-low md:rounded-[2rem] md:p-3">
          {/* Search row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar candidato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9 rounded-xl text-sm bg-surface-container-low border-outline-variant/40 dark:bg-surface-container"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIndexOpen((v) => !v)}
              aria-expanded={indexOpen}
              aria-label={indexOpen ? "Ocultar índice" : "Mostrar índice"}
              className="h-9 w-9 shrink-0 rounded-xl border border-outline-variant/55 bg-surface-container-low flex items-center justify-center hover:bg-surface-container dark:border-outline-variant/65 dark:bg-surface-container"
            >
              {indexOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Location index pills */}
          {indexOpen && groups.length > 0 && (
            <div className="mt-2 flex max-h-56 flex-wrap gap-2 overflow-y-auto border-t border-outline-variant/45 pt-2 pr-1 pb-1 dark:border-outline-variant/60">
              {groups.map((g) => (
                <button
                  key={g.groupKey}
                  type="button"
                  onClick={() => scrollTo(g.groupKey)}
                  className="h-8 inline-flex items-center gap-1.5 rounded-full border border-outline-variant/55 bg-surface-container-low px-2.5 text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors dark:bg-surface-container"
                >
                  {g.label}
                  <span className="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5">{g.candidates.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <main className="max-w-4xl mx-auto px-4 pb-16 pt-4 space-y-8">
        {groups.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Sin resultados para "{search}"</p>
          </div>
        )}

        {groups.map((group) => (
          <section
            key={group.groupKey}
            ref={(el) => {
              if (el) sectionRefs.current.set(group.groupKey, el);
            }}
          >
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/40">
              <MapPin className="w-4 h-4 text-primary/70 shrink-0" />
              <h2 className="text-sm font-bold text-foreground tracking-tight">{group.label}</h2>
              <span className="text-xs text-muted-foreground ml-1">{group.candidates.length}</span>
            </div>

            <div className="space-y-3">
              {group.candidates.map((c) => (
                <div
                  key={c.id}
                  className="flex gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="shrink-0 pt-0.5">
                    <CandidateAvatar name={c.name} surname={c.surname} imageUrl={c.image_url} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base leading-tight">{formatCandidateName(c)}</p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      {c.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {c.location}
                        </span>
                      )}
                      {c.group_name && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Tag className="w-3 h-3" />
                          {c.group_name}
                        </span>
                      )}
                      {c.age && (
                        <span className="text-xs text-muted-foreground">{c.age} años</span>
                      )}
                    </div>

                    {c.description && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
