import { useEffect, useMemo, useRef, useState } from "react";
import { CandidateListCard } from "@/components/voting/CandidateListCard";
import { CandidateDetailModal } from "@/components/voting/CandidateDetailModal";
import { Search, X, MapPin, Users, ChevronDown } from "lucide-react";
import { HeaderControls } from "@/components/shared/HeaderControls";
import { VotingTutorial } from "@/components/voting/VotingTutorial";
import type { CandidateRow } from "@/types/db";

type Candidate = CandidateRow;

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

  const currentDetailIndex = detailCandidate ? filteredCandidates.findIndex((c) => c.id === detailCandidate.id) : -1;
  const handleNextCandidate = () => {
    if (currentDetailIndex === -1 || filteredCandidates.length <= 1) return;
    const nextIdx = (currentDetailIndex + 1) % filteredCandidates.length;
    setDetailCandidate(filteredCandidates[nextIdx]);
  };
  const handlePrevCandidate = () => {
    if (currentDetailIndex === -1 || filteredCandidates.length <= 1) return;
    const prevIdx = (currentDetailIndex - 1 + filteredCandidates.length) % filteredCandidates.length;
    setDetailCandidate(filteredCandidates[prevIdx]);
  };

  const isFlatLayout =
    locationGroups.length === 1 && locationGroups[0].groups.length === 1;

  return (
    <div>
      <CandidateDetailModal 
        candidate={detailCandidate} 
        onClose={() => { setDetailCandidate(null); setDetailZoomed(false); }} 
        initialZoom={detailZoomed} 
        onNext={handleNextCandidate}
        onPrev={handlePrevCandidate}
      />
      {/* Sticky header */}
      <div className="pub-sticky" ref={mobileIndexRef}>
        <div className="pub-sticky-card max-w-full">
          <div className="flex items-center gap-[7px]">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--avd-fg-faint)] pointer-events-none" />
              <input
                className={`avd-input h-[42px] !pl-[44px] text-[15px] ${searchQuery ? 'pr-[38px]' : 'pr-3'}`}
                placeholder="Buscar candidato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer p-0 text-[var(--avd-fg-faint)] flex"
                >
                  <X className="w-[14px] h-[14px]" />
                </button>
              )}
            </div>

            {/* Index toggle */}
            <button
              type="button"
              className="avd-btn avd-btn-icon w-[42px] h-[42px]"
              onClick={() => setIsMobileIndexOpen((p) => !p)}
              title={isMobileIndexOpen ? "Ocultar índice" : "Mostrar índice de lugares"}
            >
              <ChevronDown className={`w-5 h-5 transition-transform duration-[0.2s]${isMobileIndexOpen ? ' rotate-180' : ''}`} />
            </button>

            <VotingTutorial compactTrigger roundId={tutorialRoundId} />
            <HeaderControls mode="inline" />
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
                  <MapPin className="w-[10px] h-[10px]" />
                  {locGroup.location}
                  <span className="bg-[var(--avd-bg-sunken)] border border-[var(--avd-border-soft)] rounded-full px-1.5 py-px text-[10px] font-bold text-[var(--avd-fg-muted)]">
                    {locGroup.totalCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pub-content max-w-full pt-3">
        {locationGroups.length === 0 && searchQuery && (
          <p className="text-center text-[var(--avd-fg-muted)] py-8 font-[var(--avd-font-sans)]">
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
                  <MapPin className="w-[14px] h-[14px] text-[var(--avd-brand)] shrink-0" />
                  <span className="font-bold text-[14px] text-[var(--avd-fg)] flex-1 text-left tracking-[-0.005em]">
                    {locGroup.location}
                  </span>
                  <span className="bg-[var(--avd-bg-sunken)] border border-[var(--avd-border-soft)] rounded-full px-2 py-px text-[11px] font-bold text-[var(--avd-fg-muted)] shrink-0">
                    {locGroup.totalCount}
                  </span>
                  <span className="text-[12px] text-[var(--avd-fg-muted)] font-medium shrink-0">
                    {isExpanded ? "Ocultar" : "Mostrar"} ∧
                  </span>
                  <ChevronDown className={`w-[13px] h-[13px] shrink-0 text-[var(--avd-fg-muted)] transition-transform duration-[0.18s]${isExpanded ? ' rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="pub-group-body">
                    {locGroup.groups.length > 1
                      ? locGroup.groups.map((group) => (
                          <div
                            key={`${locationKey}::${slugify(group.groupName)}`}
                            className="mb-4"
                          >
                            <div className="flex items-center gap-[6px] border-b border-[var(--avd-border-soft)] pb-2 mt-[10px] mb-[10px]">
                              <Users className="w-[13px] h-[13px] text-[var(--avd-fg-muted)]" />
                              <span className="text-[13px] font-semibold text-[var(--avd-fg-muted)]">
                                {group.groupName}
                              </span>
                              <span className="bg-[var(--avd-bg-sunken)] border border-[var(--avd-border-soft)] rounded-full px-1.5 py-px text-[11px] font-bold text-[var(--avd-fg-muted)]">
                                {group.candidates.length}
                              </span>
                              {group.avgAge !== Infinity && (
                                <span className="text-[12px] text-[var(--avd-fg-faint)] ml-1">
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
                          <div className="pt-[6px]">
                            {locGroup.groups[0]?.groupName && locGroup.groups[0].groupName !== "Sin grupo" && (
                              <div className="flex items-center gap-[6px] border-b border-[var(--avd-border-soft)] pb-2 mb-[10px]">
                                <Users className="w-[13px] h-[13px] text-[var(--avd-fg-muted)]" />
                                <span className="text-[13px] font-semibold text-[var(--avd-fg-muted)]">
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
