import { useEffect, useMemo, useState } from "react";
import { CandidateCard } from "@/components/CandidateCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, ChevronDown, ChevronRight } from "lucide-react";

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
  const [collapsedLocations, setCollapsedLocations] = useState<Record<string, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsedLocations((prev) => {
      const next = { ...prev };
      for (const loc of locationGroups) {
        if (!(loc.location in next)) {
          next[loc.location] = false;
        }
      }
      return next;
    });

    setCollapsedGroups((prev) => {
      const next = { ...prev };
      for (const loc of locationGroups) {
        for (const group of loc.groups) {
          const key = `${loc.location}::${group.groupName}`;
          if (!(key in next)) {
            next[key] = false;
          }
        }
      }
      return next;
    });
  }, [locationGroups]);

  const toggleLocation = (location: string) => {
    setCollapsedLocations((prev) => ({ ...prev, [location]: !prev[location] }));
  };

  const toggleGroup = (location: string, groupName: string) => {
    const key = `${location}::${groupName}`;
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const scrollToLocation = (location: string) => {
    const target = document.getElementById(`loc-${slugify(location)}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      {/* Dynamic index for quick navigation between location blocks */}
      <div className="sticky top-0 z-20 rounded-xl border bg-background/95 p-3 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Indice dinamico</p>
          <p className="text-xs text-muted-foreground">{locationGroups.length} zonas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {locationGroups.map((locGroup) => (
            <Button
              key={`index-${locGroup.location}`}
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => scrollToLocation(locGroup.location)}
            >
              {locGroup.location}
              <Badge variant="secondary" className="ml-2 text-xs">{locGroup.totalCount}</Badge>
            </Button>
          ))}
        </div>
      </div>

      {locationGroups.map((locGroup) => (
        <div key={locGroup.location} id={`loc-${slugify(locGroup.location)}`}>
          {/* Location Header */}
          <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-2 mb-4">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left text-lg font-semibold"
              onClick={() => toggleLocation(locGroup.location)}
            >
              {collapsedLocations[locGroup.location] ? (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
              <MapPin className="w-5 h-5 text-primary" />
              <span>{locGroup.location}</span>
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                {locGroup.totalCount} persona
                {locGroup.totalCount !== 1 ? "s" : ""}
              </span>
            </button>
          </div>

          {!collapsedLocations[locGroup.location] && (
            <div className="space-y-6">
            {locGroup.groups.map((group) => (
              <div key={`${locGroup.location}-${group.groupName}`}>
                {/* Group Sub-Header (only if there are multiple groups) */}
                {locGroup.groups.length > 1 && (
                  <button
                    type="button"
                    className="mb-3 flex w-full items-center gap-2 pl-1 text-left text-sm font-medium text-muted-foreground"
                    onClick={() => toggleGroup(locGroup.location, group.groupName)}
                  >
                    {collapsedGroups[`${locGroup.location}::${group.groupName}`] ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <Users className="w-4 h-4" />
                    <span>{group.groupName}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      {group.candidates.length}
                    </span>
                    {group.avgAge !== Infinity && (
                      <span className="text-xs text-muted-foreground/70">
                        · Edad media:{" "}
                        {Math.round(group.avgAge)} años
                      </span>
                    )}
                  </button>
                )}

                {/* Candidate Grid */}
                {!collapsedGroups[`${locGroup.location}::${group.groupName}`] && (
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
                )}
              </div>
            ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
