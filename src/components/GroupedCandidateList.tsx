import { useEffect, useMemo, useRef, useState } from "react";
import { CandidateCard } from "@/components/CandidateCard";
import { Button } from "@/components/ui/button";
import { Accordion, Chip, Surface } from "@heroui/react";
import { Users, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VotingTutorial } from "@/components/VotingTutorial";

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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Groups candidates by location (alphabetically) then by group_name
 * (sorted by average age ascending). Candidates without location go
 * into "Sin lugar asignado" and those without group go into "Sin grupo".
 */
function groupCandidates(candidates: Candidate[]): LocationGroup[] {
  // Only show active (not eliminated, not selected) candidates
  const active = candidates.filter((c) => !c.is_eliminated && !c.is_selected);

  // Group by location
  const locationMap = new Map<string, Candidate[]>();
  for (const c of active) {
    const loc = c.location?.trim() || "Sin lugar asignado";
    if (!locationMap.has(loc)) locationMap.set(loc, []);
    locationMap.get(loc)!.push(c);
  }

  // Sort locations alphabetically (with "Sin lugar" at the end)
  const sortedLocations = Array.from(locationMap.keys()).sort((a, b) => {
    if (a === "Sin lugar asignado") return 1;
    if (b === "Sin lugar asignado") return -1;
    return a.localeCompare(b, "es");
  });

  return sortedLocations.map((location) => {
    const locCandidates = locationMap.get(location)!;

    // Group by group_name within this location
    const groupMap = new Map<string, Candidate[]>();
    for (const c of locCandidates) {
      const grp = c.group_name?.trim() || "Sin grupo";
      if (!groupMap.has(grp)) groupMap.set(grp, []);
      groupMap.get(grp)!.push(c);
    }

    // Calculate average age for each group and sort by it (ascending)
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

    return {
      location,
      groups,
      totalCount: locCandidates.length,
    };
  });
}

export function GroupedCandidateList({
  candidates,
  selectedCandidates,
  onToggleCandidate,
  disabled = false,
  tutorialRoundId,
}: GroupedCandidateListProps) {
  const locationGroups = useMemo(
    () => groupCandidates(candidates),
    [candidates]
  );

  const [expandedLocationKeys, setExpandedLocationKeys] = useState<string[]>([]);
  const [isMobileIndexOpen, setIsMobileIndexOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  const mobileIndexRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const allKeys = locationGroups.map((locGroup) => `loc-${slugify(locGroup.location)}`);

    setExpandedLocationKeys((prev) => {
      const keepExisting = prev.filter((key) => allKeys.includes(key));
      return keepExisting.length > 0 ? keepExisting : allKeys;
    });
  }, [locationGroups]);

  useEffect(() => {
    if (!isMobileIndexOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (mobileIndexRef.current && !mobileIndexRef.current.contains(target)) {
        setIsMobileIndexOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMobileIndexOpen]);

  const scrollToLocation = (location: string) => {
    const target = document.getElementById(`loc-${slugify(location)}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openAndScrollToLocation = (location: string) => {
    const key = `loc-${slugify(location)}`;

    setExpandedLocationKeys((prev) =>
      prev.includes(key) ? prev : [...prev, key]
    );

    setIsMobileIndexOpen(false);

    window.setTimeout(() => {
      scrollToLocation(location);
    }, 80);
  };

  const toggleMobileIndex = () => {
    setIsMobileIndexOpen((prev) => !prev);
  };

  // If there's only one location and one group, don't show headers (flat layout)
  const isFlatLayout =
    locationGroups.length === 1 && locationGroups[0].groups.length === 1;

  if (isFlatLayout) {
    return (
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locationGroups[0].groups[0].candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            isSelected={selectedCandidates.includes(candidate.id)}
            onToggle={onToggleCandidate}
            disabled={disabled}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Surface
        ref={mobileIndexRef}
        className="sticky top-2 z-30 rounded-[1.6rem] border border-outline-variant/55 bg-surface-container-lowest/92 p-2.5 shadow-tech backdrop-blur-xl dark:border-outline-variant/70 dark:bg-surface-container-low/90 md:top-4 md:rounded-[2rem] md:p-3"
      >
        <div className="grid grid-cols-5 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="col-span-4 h-10 justify-between rounded-xl border border-outline-variant/55 bg-surface-container-low px-3 hover:bg-surface-container dark:border-outline-variant/65 dark:bg-surface-container"
            aria-expanded={isMobileIndexOpen}
            aria-controls="dynamic-voting-index"
            onClick={toggleMobileIndex}
          >
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/90">
              Indice
              <span className="text-[11px] normal-case tracking-normal text-muted-foreground">
                {locationGroups.length} zonas
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              {isMobileIndexOpen ? "Ocultar" : "Mostrar"}
              {isMobileIndexOpen ? (
                <ChevronUp className="h-4 w-4 text-primary" />
              ) : (
                <ChevronDown className="h-4 w-4 text-primary" />
              )}
            </span>
          </Button>

          <div className="col-span-1 flex justify-end gap-1">
            <VotingTutorial compactTrigger roundId={tutorialRoundId} />
            <ThemeToggle mode="inline" buttonClassName="h-9 w-9 rounded-xl shadow-none" />
          </div>
        </div>

        <div
          id="dynamic-voting-index"
          className={`${isMobileIndexOpen ? "mt-2 flex" : "hidden"} max-h-56 flex-wrap gap-2 overflow-y-auto border-t border-outline-variant/45 pt-2 pr-1 pb-1 dark:border-outline-variant/60 md:mt-2 md:max-h-none md:overflow-visible`}
        >
          {locationGroups.map((locGroup) => (
            <Button
              type="button"
              key={`index-${locGroup.location}`}
              size="sm"
              variant="secondary"
              className="h-8 rounded-full px-2.5 text-xs md:h-9 md:px-3"
              aria-label={`Ir a la zona ${locGroup.location}`}
              onClick={() => openAndScrollToLocation(locGroup.location)}
            >
              {locGroup.location}
              <Chip size="sm" variant="soft" color="default" className="ml-2 font-semibold">{locGroup.totalCount}</Chip>
            </Button>
          ))}
        </div>
      </Surface>

      <Accordion.Root
        allowsMultipleExpanded
        expandedKeys={expandedLocationKeys}
        onExpandedChange={(keys) => {
          const normalized = Array.from(keys as Iterable<string | number>).map((value) => String(value));
          setExpandedLocationKeys(normalized);
        }}
        variant="surface"
        className="space-y-3"
      >
        {locationGroups.map((locGroup) => {
          const locationKey = `loc-${slugify(locGroup.location)}`;
          const isLocationExpanded = expandedLocationKeys.includes(locationKey);

          return (
            <div
              key={locationKey}
              id={locationKey}
              className="scroll-mt-32 border border-slate-200 bg-white/50 p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 md:p-2 rounded-3xl"
            >
              <Accordion.Item
                id={locationKey}
                className="rounded-[1.45rem] border-0 bg-transparent px-0 py-0 shadow-none md:rounded-[1.65rem]"
              >
                <Accordion.Heading>
                  <Accordion.Trigger className="px-2.5 py-2.5 hover:no-underline md:px-3 md:py-3">
                    <div className="flex w-full items-center gap-2 text-left">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div className="flex flex-col leading-tight">
                        <span className="font-headline text-lg font-bold text-slate-900 dark:text-slate-100">{locGroup.location}</span>
                      </div>
                      <span className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-primary">
                        <span className="rounded-full border border-slate-300/80 bg-slate-100/90 px-2 py-0.5 text-slate-700 dark:border-slate-700/85 dark:bg-slate-800/80 dark:text-slate-200">
                          {locGroup.totalCount} persona{locGroup.totalCount !== 1 ? "s" : ""}
                        </span>
                        <span>{isLocationExpanded ? "Ocultar" : "Mostrar"}</span>
                        {isLocationExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    </div>
                  </Accordion.Trigger>
                </Accordion.Heading>

                <Accordion.Panel>
                  <Accordion.Body className="mt-2 px-2 pb-3.5 pt-1 md:px-3 md:pb-4">
                    {locGroup.groups.length > 1 ? (
                      <div className="space-y-3">
                        {locGroup.groups.map((group) => {
                          const groupKey = `${locationKey}::${slugify(group.groupName)}`;

                          return (
                            <section
                              key={groupKey}
                              className="mb-8 last:mb-0"
                            >
                              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                                <Users className="h-4 w-4 text-slate-500" />
                                <span className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
                                  {group.groupName}
                                </span>
                                <Chip size="sm" variant="soft" color="default" className="font-semibold px-2">
                                  {group.candidates.length}
                                </Chip>
                                {group.avgAge !== Infinity && (
                                  <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Edad media: {Math.round(group.avgAge)} años
                                  </span>
                                )}
                              </div>
                              <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {group.candidates.map((candidate) => (
                                  <CandidateCard
                                    key={candidate.id}
                                    candidate={candidate}
                                    isSelected={selectedCandidates.includes(candidate.id)}
                                    onToggle={onToggleCandidate}
                                    disabled={disabled}
                                  />
                                ))}
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mb-4">
                        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                          <Users className="h-4 w-4 text-slate-500" />
                          <span className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
                            {locGroup.groups[0].groupName}
                          </span>
                          <Chip size="sm" variant="soft" color="default" className="font-semibold px-2">
                            {locGroup.groups[0].candidates.length}
                          </Chip>
                        </div>
                        <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {locGroup.groups[0].candidates.map((candidate) => (
                            <CandidateCard
                              key={candidate.id}
                              candidate={candidate}
                              isSelected={selectedCandidates.includes(candidate.id)}
                              onToggle={onToggleCandidate}
                              disabled={disabled}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            </div>
          );
        })}
      </Accordion.Root>
    </div>
  );
}
