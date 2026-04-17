import { useEffect, useMemo, useState } from "react";
import { CandidateCard } from "@/components/CandidateCard";
import { Button } from "@/components/ui/button";
import { Accordion, Chip, Surface } from "@heroui/react";
import { Users, MapPin } from "lucide-react";

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
}: GroupedCandidateListProps) {
  const locationGroups = useMemo(
    () => groupCandidates(candidates),
    [candidates]
  );

  const [expandedLocationKeys, setExpandedLocationKeys] = useState<string[]>([]);
  const [isMobileIndexOpen, setIsMobileIndexOpen] = useState(false);

  useEffect(() => {
    const allKeys = locationGroups.map((locGroup) => `loc-${slugify(locGroup.location)}`);

    setExpandedLocationKeys((prev) => {
      const keepExisting = prev.filter((key) => allKeys.includes(key));
      return keepExisting.length > 0 ? keepExisting : allKeys;
    });
  }, [locationGroups]);

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

  // If there's only one location and one group, don't show headers (flat layout)
  const isFlatLayout =
    locationGroups.length === 1 && locationGroups[0].groups.length === 1;

  if (isFlatLayout) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
    <div className="space-y-8">
      <Surface className="sticky top-2 z-30 rounded-2xl border border-blue-300/60 bg-white/90 p-3 shadow-[0_24px_48px_-32px_rgba(37,99,235,0.9)] backdrop-blur-md dark:border-blue-500/25 dark:bg-slate-900/85 md:top-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Indice dinamico</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{locationGroups.length} zonas</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs md:hidden"
              onClick={() => setIsMobileIndexOpen((prev) => !prev)}
            >
              {isMobileIndexOpen ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
        </div>
        <div className={`${isMobileIndexOpen ? "flex" : "hidden"} max-h-48 flex-wrap gap-2 overflow-y-auto pr-1 md:flex md:max-h-none md:overflow-visible`}>
          {locationGroups.map((locGroup) => (
            <Button
              type="button"
              key={`index-${locGroup.location}`}
              size="sm"
              variant="outline"
              className="h-10 rounded-xl border-2 border-blue-300/80 bg-white px-3 text-slate-800 shadow-[0_10px_24px_-18px_rgba(37,99,235,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-[0_14px_28px_-18px_rgba(37,99,235,0.95)] active:translate-y-0 active:scale-[0.98] dark:border-blue-500/35 dark:bg-slate-900/85 dark:text-slate-100 dark:hover:border-blue-400/55 dark:hover:bg-blue-950/35"
              onClick={() => openAndScrollToLocation(locGroup.location)}
            >
              {locGroup.location}
              <Chip size="sm" variant="soft" color="accent" className="ml-2 font-semibold">{locGroup.totalCount}</Chip>
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

          return (
            <div key={locationKey} id={locationKey} className="scroll-mt-28">
              <Accordion.Item
                id={locationKey}
                className="rounded-2xl border border-blue-300/60 bg-white/80 px-1 dark:border-blue-500/25 dark:bg-slate-900/78"
              >
                <Accordion.Heading>
                  <Accordion.Trigger className="px-3 py-3 hover:no-underline">
                    <div className="flex w-full items-center gap-2 text-left">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="text-lg font-semibold">{locGroup.location}</span>
                      <span className="ml-auto text-sm font-normal text-muted-foreground">
                        {locGroup.totalCount} persona{locGroup.totalCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </Accordion.Trigger>
                </Accordion.Heading>

                <Accordion.Panel>
                  <Accordion.Body className="px-3 pb-4">
                    {locGroup.groups.length > 1 ? (
                      <Accordion.Root
                        allowsMultipleExpanded
                        defaultExpandedKeys={locGroup.groups.map((group) => `${locationKey}::${slugify(group.groupName)}`)}
                        variant="default"
                        className="space-y-2"
                      >
                        {locGroup.groups.map((group) => {
                          const groupKey = `${locationKey}::${slugify(group.groupName)}`;

                          return (
                            <Accordion.Item
                              key={groupKey}
                              id={groupKey}
                              className="rounded-xl border border-blue-200/70 bg-white/80 dark:border-blue-500/20 dark:bg-slate-900/65"
                            >
                              <Accordion.Heading>
                                <Accordion.Trigger className="px-3 py-2.5 hover:no-underline">
                                  <div className="flex w-full items-center gap-2 text-left">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium text-muted-foreground">{group.groupName}</span>
                                    <Chip size="sm" variant="soft" color="default" className="font-semibold">
                                      {group.candidates.length}
                                    </Chip>
                                    {group.avgAge !== Infinity && (
                                      <span className="text-xs text-muted-foreground/70">
                                        Edad media: {Math.round(group.avgAge)} anios
                                      </span>
                                    )}
                                  </div>
                                </Accordion.Trigger>
                              </Accordion.Heading>

                              <Accordion.Panel>
                                <Accordion.Body className="px-2 pb-3">
                                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                </Accordion.Body>
                              </Accordion.Panel>
                            </Accordion.Item>
                          );
                        })}
                      </Accordion.Root>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
