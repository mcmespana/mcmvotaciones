import { useState, useCallback, useEffect } from "react";

const PREFIX = "mcm-fav-";

function storageKey(roundId: string) {
  return `${PREFIX}${roundId}`;
}

function loadFavorites(roundId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(roundId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(roundId: string, ids: Set<string>) {
  try {
    localStorage.setItem(storageKey(roundId), JSON.stringify([...ids]));
  } catch { /* storage full — ignore */ }
}

export function useFavorites(roundId: string | undefined) {
  const [favorites, setFavorites] = useState<Set<string>>(() =>
    roundId ? loadFavorites(roundId) : new Set()
  );

  // Reload from storage when roundId becomes available (e.g. async page load)
  useEffect(() => {
    if (roundId) setFavorites(loadFavorites(roundId));
  }, [roundId]);

  const toggle = useCallback((candidateId: string) => {
    if (!roundId) return;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      saveFavorites(roundId, next);
      return next;
    });
  }, [roundId]);

  const isFavorite = useCallback(
    (candidateId: string) => favorites.has(candidateId),
    [favorites]
  );

  return { favorites, toggle, isFavorite, count: favorites.size };
}
