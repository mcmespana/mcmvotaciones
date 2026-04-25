import { useEffect, useMemo, useRef, useState } from "react";
import { CandidateListCard } from "@/components/voting/CandidateListCard";
import { CandidateDetailModal } from "@/components/voting/CandidateDetailModal";
import { Search, X, MapPin, Users, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { VotingTutorial } from "@/components/voting/VotingTutorial";

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
  is_eliminated: boolean;
  is_selected: boolean;
}

interface GroupedCandidateListProps {
  candidates: Candidate[];
  selectedCandidates: string[];
  onToggleCandidate: (id: string) => void;
  disabled?: boolean;
  tutorialRoundId?: string;
}

interface CandidateGroup {
  groupName: string;
  candidates: Candidate[];
  avgAge: number;
}

interface LocationGroup {
  location: string;
  groups: CandidateGroup[];
  totalCount: number;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function groupCandidates(candidates: Candidate[]): LocationGroup[] {
  const active = candidates.filter((c) => !c.is_eliminated && !c.is_selected);

  const locationMap = new Map<string, Candidate[]>();
  for (const c of active) {
    const loc = c.location?.trim() || "Sin lugar asignado";
    if (!locationMap.has(loc)) locationMap.set(loc, []);
    locationMap.get(loc)!.push(c);
  }

  const sortedLocations = Array.from(locationMap.keys()).sort((a, b) => {
    if (a === "Sin lugar asignado") return 1;
    if (b === "Sin lugar asignado") return -1;
    return a.localeCompare(b, "es");
  });

  return sortedLocations.map((location) => {
    const locCandidates = locationMap.get(location)!;

    const groupMap = new Map<string, Candidate[]>();
    for (const c of locCandidates) {
      const grp = c.group_name?.trim() || "Sin grupo";
      if (!groupMap.has(grp)) groupMap.set(grp, []);
      groupMap.get(grp)!.push(c);
    }

    const groups: CandidateGroup[] = Array.from(groupMap.entries())
      .map(([groupName, cands]) => {
        const ages = cands.filter((c) => c.age !== null).map((c) => c.age!);
        const avgAge =
          ages.length > 0
            ? ages.reduce((sum, a) => sum + a, 0) / ages.length
            : Infinity;
        return { groupName, candidates: cands, avgAge };
      })
      .sort((a, b) => {
        if (a.groupName === "Sin grupo") return 1;
        if (b.groupName === "Sin grupo") return -1;
        return a.avgAge - b.avgAge;
      });

    return { location, groups, totalCount: locCandidates.length };
  });
}

function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function GroupedCandidateList({
  candidates,
  selectedCandidates,
  onToggleCandidate,
  disabled = false,
  tutorialRoundId,
}: GroupedCandidateListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [detailZoomed, setDetailZoomed] = useState(false);
  const [expandedLocationKeys, setExpandedLocationKeys] = useState<string[]>([]);
  const [isMobileIndexOpen, setIsMobileIndexOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  const mobileIndexRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  const filteredCandidates = useMemo(() => {
    const q = normalizeForSearch(searchQuery.trim());
    if (!q) return candidates;
    return candidates.filter((c) =>
      normalizeForSearch(`${c.name} ${c.surname}`).includes(q)
    );
  }, [candidates, searchQuery]);

  const locationGroups = useMemo(
    () => groupCandidates(filteredCandidates),
    [filteredCandidates]
  );

  useEffect(() => {
    const allKeys = locationGroups.map((g) => `loc-${slugify(g.location)}`);
    setExpandedLocationKeys((prev) => {
      const keep = prev.filter((k) => allKeys.includes(k));
      return keep.length > 0 ? keep : allKeys;
    });
  }, [locationGroups]);

  useEffect(() => {
    if (!isMobileIndexOpen) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (t && mobileIndexRef.current && !mobileIndexRef.current.contains(t)) {
        setIsMobileIndexOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [isMobileIndexOpen]);

  const openAndScrollToLocation = (location: string) => {
    const key = `loc-${slugify(location)}`;
    setExpandedLocationKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setIsMobileIndexOpen(false);
    window.setTimeout(() => {
      const el = document.getElementById(key);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const toggleLocation = (key: string) => {
    setExpandedLocationKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isFlatLayout =
    locationGroups.length === 1 && locationGroups[0].groups.length === 1;

  return (
    <div>
      <CandidateDetailModal candidate={detailCandidate} onClose={() => { setDetailCandidate(null); setDetailZoomed(false); }} initialZoom={detailZoomed} />
      {/* Sticky header */}
      <div className="pub-sticky" ref={mobileIndexRef}>
        <div className="pub-sticky-card" style={{ maxWidth: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {/* Search */}
            <div style={{ flex: 1, position: "relative" }}>
              <Search
                style={{
                  position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)", width: 14, height: 14,
                  color: "var(--avd-fg-faint)", pointerEvents: "none",
                }}
              />
              <input
                className="avd-input"
                style={{ paddingLeft: 32, paddingRight: searchQuery ? 32 : 10 }}
                placeholder="Buscar candidato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute", right: 10, top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer", padding: 0,
                    color: "var(--avd-fg-faint)", display: "flex",
                  }}
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>

            {/* Index toggle */}
            <button
              type="button"
              className="avd-btn avd-btn-icon"
              onClick={() => setIsMobileIndexOpen((p) => !p)}
              title={isMobileIndexOpen ? "Ocultar índice" : "Mostrar índice de lugares"}
            >
              <ChevronDown
                style={{
                  transition: "transform 0.2s",
                  transform: isMobileIndexOpen ? "rotate(180deg)" : "none",
                }}
              />
            </button>

            <VotingTutorial compactTrigger roundId={tutorialRoundId} />
            <ThemeToggle
              mode="inline"
              buttonClassName="h-8 w-8 rounded-md shadow-none"
            />
          </div>

          {isMobileIndexOpen && locationGroups.length > 0 && (
            <div className="pub-index">
              {locationGroups.map((locGroup) => (
                <button
                  key={locGroup.location}
                  type="button"
                  className="pub-index-pill"
                  onClick={() => openAndScrollToLocation(locGroup.location)}
                >
                  <MapPin style={{ width: 10, height: 10 }} />
                  {locGroup.location}
                  <span
                    style={{
                      background: "var(--avd-bg-sunken)",
                      border: "1px solid var(--avd-border-soft)",
                      borderRadius: 999, padding: "1px 6px",
                      fontSize: 10, fontWeight: 700, color: "var(--avd-fg-muted)",
                    }}
                  >
                    {locGroup.totalCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pub-content" style={{ maxWidth: "100%", padding: "12px 0 0" }}>
        {locationGroups.length === 0 && searchQuery && (
          <p style={{ textAlign: "center", color: "var(--avd-fg-muted)", padding: "32px 0", fontFamily: "var(--avd-font-sans)" }}>
            Sin resultados para «{searchQuery}»
          </p>
        )}

        {isFlatLayout ? (
          <div className="pub-cand-grid">
            {locationGroups[0]?.groups[0]?.candidates.map((c) => (
              <CandidateListCard
                key={c.id}
                candidate={c}
                selected={selectedCandidates.includes(c.id)}
                onClick={disabled ? undefined : () => onToggleCandidate(c.id)}
                onDetailView={(cand) => { setDetailZoomed(false); setDetailCandidate(cand); }}
                onImageLongPress={(cand) => { setDetailZoomed(true); setDetailCandidate(cand); }}
              />
            ))}
          </div>
        ) : (
          locationGroups.map((locGroup) => {
            const locationKey = `loc-${slugify(locGroup.location)}`;
            const isExpanded = expandedLocationKeys.includes(locationKey);

            return (
              <div
                key={locationKey}
                id={locationKey}
                className="pub-group"
                ref={(el) => {
                  if (el) sectionRefs.current.set(locationKey, el);
                }}
              >
                <button
                  type="button"
                  className="pub-group-head"
                  onClick={() => toggleLocation(locationKey)}
                >
                  <MapPin
                    style={{ width: 14, height: 14, color: "var(--avd-brand)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontWeight: 700, fontSize: 14, color: "var(--avd-fg)",
                      flex: 1, textAlign: "left", letterSpacing: "-0.005em",
                    }}
                  >
                    {locGroup.location}
                  </span>
                  <span
                    style={{
                      background: "var(--avd-bg-sunken)",
                      border: "1px solid var(--avd-border-soft)",
                      borderRadius: 999, padding: "1px 8px",
                      fontSize: 11, fontWeight: 700, color: "var(--avd-fg-muted)", flexShrink: 0,
                    }}
                  >
                    {locGroup.totalCount}
                  </span>
                  <span
                    style={{ fontSize: 12, color: "var(--avd-fg-muted)", fontWeight: 500, flexShrink: 0 }}
                  >
                    {isExpanded ? "Ocultar" : "Mostrar"} ∧
                  </span>
                  <ChevronDown
                    style={{
                      width: 13, height: 13, flexShrink: 0,
                      color: "var(--avd-fg-muted)", transition: "transform 0.18s",
                      transform: isExpanded ? "rotate(180deg)" : "none",
                    }}
                  />
                </button>

                {isExpanded && (
                  <div className="pub-group-body">
                    {locGroup.groups.length > 1
                      ? locGroup.groups.map((group) => (
                          <div
                            key={`${locationKey}::${slugify(group.groupName)}`}
                            style={{ marginBottom: 16 }}
                          >
                            <div
                              style={{
                                display: "flex", alignItems: "center", gap: 6,
                                borderBottom: "1px solid var(--avd-border-soft)",
                                paddingBottom: 8, marginTop: 10, marginBottom: 10,
                              }}
                            >
                              <Users style={{ width: 13, height: 13, color: "var(--avd-fg-muted)" }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--avd-fg-muted)" }}>
                                {group.groupName}
                              </span>
                              <span
                                style={{
                                  background: "var(--avd-bg-sunken)",
                                  border: "1px solid var(--avd-border-soft)",
                                  borderRadius: 999, padding: "1px 6px",
                                  fontSize: 11, fontWeight: 700, color: "var(--avd-fg-muted)",
                                }}
                              >
                                {group.candidates.length}
                              </span>
                              {group.avgAge !== Infinity && (
                                <span style={{ fontSize: 12, color: "var(--avd-fg-faint)", marginLeft: 4 }}>
                                  Edad media: {Math.round(group.avgAge)} a
                                </span>
                              )}
                            </div>
                            <div className="pub-cand-grid">
                              {group.candidates.map((c) => (
                              <CandidateListCard
                                key={c.id}
                                candidate={c}
                                selected={selectedCandidates.includes(c.id)}
                                onClick={disabled ? undefined : () => onToggleCandidate(c.id)}
                                onDetailView={(cand) => { setDetailZoomed(false); setDetailCandidate(cand); }}
                                onImageLongPress={(cand) => { setDetailZoomed(true); setDetailCandidate(cand); }}
                              />
                              ))}
                            </div>
                          </div>
                        ))
                      : (
                          <div style={{ paddingTop: 6 }}>
                            {locGroup.groups[0]?.groupName && locGroup.groups[0].groupName !== "Sin grupo" && (
                              <div
                                style={{
                                  display: "flex", alignItems: "center", gap: 6,
                                  borderBottom: "1px solid var(--avd-border-soft)",
                                  paddingBottom: 8, marginBottom: 10,
                                }}
                              >
                                <Users style={{ width: 13, height: 13, color: "var(--avd-fg-muted)" }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--avd-fg-muted)" }}>
                                  {locGroup.groups[0].groupName}
                                </span>
                              </div>
                            )}
                            <div className="pub-cand-grid">
                              {locGroup.groups[0]?.candidates.map((c) => (
                              <CandidateListCard
                                key={c.id}
                                candidate={c}
                                selected={selectedCandidates.includes(c.id)}
                                onClick={disabled ? undefined : () => onToggleCandidate(c.id)}
                                onDetailView={(cand) => { setDetailZoomed(false); setDetailCandidate(cand); }}
                                onImageLongPress={(cand) => { setDetailZoomed(true); setDetailCandidate(cand); }}
                              />
                              ))}
                            </div>
                          </div>
                        )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
