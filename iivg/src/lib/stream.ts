// src/lib/stream.ts
import type { Catalog, Game, UserState } from "./types";

const START_YEAR = 1977;

function sortWithinYear(a: Game, b: Game) {
  if (a.orderIndex !== b.orderIndex) return b.orderIndex - a.orderIndex; // DESC orderIndex
  return a.title.localeCompare(b.title);
}

// YEAR pool = BASE games only (extras come via dynamicExtras)
function gamesForYearAll(year: number, catalog: Catalog, dynamicExtras: Game[]): Game[] {
  const fromBase = catalog.baseGames.filter(g => g.releaseYear === year);
  const fromDyn  = dynamicExtras.filter(g => g.releaseYear === year);
  return [...fromBase, ...fromDyn].sort(sortWithinYear);
}

export function initState(catalog: Catalog): UserState {
  const firstYear = START_YEAR;
  const initial = gamesForYearAll(firstYear, catalog, []);
  return {
    name: undefined,
    available: initial.map(g => g.id),
    completed: [],
    addedYears: initial.length ? [{ gen: 0 as any, year: firstYear }] : [],
    currentGen: catalog.gens[0]?.index ?? 1, // kept if other code reads it
    yearCursor: firstYear + 1,
    dynamicExtras: [],
    seriesRatings: {},
    earnedAchievements: [],
    lastEarned: null,
  };
}

export function ensureYearWave(state: UserState, catalog: Catalog, minVisible = 2) {
  // Build index from BASE + dynamic extras only
  const allKnown: Game[] = [...catalog.baseGames, ...state.dynamicExtras];
  const byId: Record<string, Game> = Object.fromEntries(allKnown.map(g => [g.id, g]));
  const completedSet = new Set(state.completed.map(c => c.gameId));

  const visibleCount = () => state.available.filter(id => !completedSet.has(id)).length;

  while (visibleCount() <= (minVisible - 1) && state.yearCursor <= catalog.maxYear) {
    const year = state.yearCursor;

    const batch = gamesForYearAll(year, catalog, state.dynamicExtras)
      .filter(g => !completedSet.has(g.id) && !state.available.includes(g.id));

    if (batch.length > 0) {
      state.addedYears.push({ gen: 0 as any, year });
      state.available.push(...batch.map(g => g.id));
    }

    state.yearCursor += 1;
  }

  // Remove completed from available
  state.available = state.available.filter(id => !completedSet.has(id));

  // Stable global ordering: year ASC, then orderIndex DESC, then title ASC
  state.available.sort((a, b) => {
    const ga = byId[a], gb = byId[b];
    if (!ga || !gb) return 0;
    if (ga.releaseYear !== gb.releaseYear) return ga.releaseYear - gb.releaseYear;
    return sortWithinYear(ga, gb);
  });
}

export function finishGame(state: UserState, game: Game, rating: number, catalog: Catalog) {
  state.completed.push({ gameId: game.id, rating, completedAt: new Date().toISOString() });
  state.available = state.available.filter(id => id !== game.id);

  // Do NOT inject extras here (we gate by series average AFTER recompute in the store)

  ensureYearWave(state, catalog);
}

/**
 * Call this AFTER recomputeSeriesRatings(...) in your store.
 * It adds the first unseen game in the series to dynamicExtras IFF the series avg >= 8.
 */
export function enqueueNextInSeriesIfEligible(state: UserState, catalog: Catalog, series?: string) {
  if (!series) return;
  const avg = state.seriesRatings[series];
  if (avg == null || avg < 8) return;

  const titles = catalog.seriesMap[series];
  if (!titles?.length) return;

  const completedIds = new Set(state.completed.map(c => c.gameId));
  const knownIds = new Set([
    ...catalog.baseGames.map(g => g.id),
    ...catalog.extraGames.map(g => g.id),
    ...state.dynamicExtras.map(g => g.id),
  ]);

  // find first title in series user hasn't completed yet
  let next: Game | undefined;
  for (const title of titles) {
    const g = catalog.byTitle[title];
    if (!g) continue;
    if (completedIds.has(g.id)) continue;
    next = g;
    break;
  }
  if (!next) return;

  // If it's not already known in dynamicExtras, add it
  if (!state.dynamicExtras.find(g => g.id === next!.id) && !catalog.baseGames.find(g => g.id === next!.id) && !catalog.extraGames.find(g => g.id === next!.id)) {
    // (If your loader already merged extras into extraGames, the above check prevents duplicates)
    state.dynamicExtras.push(next!);
  } else if (!state.dynamicExtras.find(g => g.id === next!.id) && !catalog.baseGames.find(g => g.id === next!.id)) {
    // if it's in extraGames but not base/dynamic, we rely on year wave; no push needed
    // but if you *only* want extras to appear when eligible, keep extras out of base/allGames and let dynamicExtras control it
  }

  // If that YEAR is already dealt, and it isn't visible or completed, show it now
  const yearDealt = state.addedYears.some(y => y.year === next.releaseYear);
  const notVisible = !state.available.includes(next.id) && !completedIds.has(next.id);
  if (yearDealt && notVisible) {
    state.available.push(next.id);
    // keep ordering
    ensureYearWave(state, catalog);
  }
}

// --- SERIES AVERAGES ---

export function recomputeSeriesRatings(state: UserState, catalog: Catalog) {
  // index from BASE + dynamic extras (extras only show when injected)
  const allKnown = [...catalog.baseGames, ...state.dynamicExtras];
  const byId: Record<string, Game> = Object.fromEntries(allKnown.map(g => [g.id, g]));
  const agg: Record<string, { sum: number; n: number }> = {};

  for (const c of state.completed) {
    const g = byId[c.gameId];
    if (!g?.series) continue;
    if (!agg[g.series]) agg[g.series] = { sum: 0, n: 0 };
    agg[g.series].sum += c.rating;
    agg[g.series].n += 1;
  }

  state.seriesRatings = Object.fromEntries(
    Object.entries(agg).map(([series, { sum, n }]) => [series, Number((sum / n).toFixed(2))])
  );
}
