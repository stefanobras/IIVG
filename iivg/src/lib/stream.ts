// src/lib/stream.ts
import type { Catalog, Game, UserState } from "./types";

function sortWithinYear(a: Game, b: Game) {
  if (a.orderIndex !== b.orderIndex) return b.orderIndex - a.orderIndex; // DESC orderIndex
  return a.title.localeCompare(b.title);
}

// --- PC helpers ---------------------------------------------------------------

const ROUNDS_UP_TO_EIGHT_MIN = 7.45;
function roundsUpToEight(avg: number | undefined | null): boolean {
  if (avg == null) return false;
  const two = Math.round(avg * 100) / 100;
  return two >= ROUNDS_UP_TO_EIGHT_MIN;
}

/**
 * Builds the "mandatory" PC set:
 *  - Always includes pcBaseGames (initial 20), minus what you've completed.
 *  - If pcAvg rounds up to 8, top-up from pcExtraGames by pcRank until you have 20 uncompleted.
 *  - (Series sequels are handled separately via dynamicExtras; we don't add them here.)
 */
function computePcMandatoryIds(state: UserState, catalog: Catalog): string[] {
  const pcBase = catalog.pcBaseGames ?? [];
  const pcExtra = catalog.pcExtraGames ?? [];
  if (pcBase.length === 0) return []; // no /data/pc present

  const completed = new Set(state.completed.map((c) => c.gameId));

  // Unplayed base PC
  const baseUnplayed = pcBase.filter((g) => !completed.has(g.id)).map((g) => g.id);

  // Top-up from extras only if user's PC avg qualifies
  let topUp: string[] = [];
  if (roundsUpToEight(state.pcAvg ?? 0)) {
    const need = Math.max(0, 20 - baseUnplayed.length);
    if (need > 0) {
      topUp = pcExtra
        .filter((g) => !completed.has(g.id))
        .sort((a, b) => {
          const ar = a.pcRank ?? 9999;
          const br = b.pcRank ?? 9999;
          if (ar !== br) return ar - br;
          if (a.releaseYear !== b.releaseYear) return a.releaseYear - b.releaseYear;
          return sortWithinYear(a, b);
        })
        .slice(0, need)
        .map((g) => g.id);
    }
  }

  // Unique
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...baseUnplayed, ...topUp]) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

// YEAR pool = BASE console games + PC mandatory + dynamicExtras
function gamesForYearAll(year: number, catalog: Catalog, state: UserState): Game[] {
  const fromBase = catalog.baseGames.filter((g) => g.releaseYear === year);

  // PC mandatory set (ids), filtered by this year
  const pcIds = computePcMandatoryIds(state, catalog);
  const byId: Record<string, Game> = Object.fromEntries(
    [...catalog.allGames, ...state.dynamicExtras].map((g) => [g.id, g]),
  );
  const fromPc = pcIds
    .map((id) => byId[id])
    .filter((g): g is Game => !!g && g.releaseYear === year);

  const fromDyn = state.dynamicExtras.filter((g) => g.releaseYear === year);

  return [...fromBase, ...fromPc, ...fromDyn].sort(sortWithinYear);
}

// --- Detect user's current year (Option A) -----------------------------------

function detectCurrentYear(state: UserState, catalog: Catalog): number {
  // Only use BASE CONSOLE games to infer progress (extras/PC should not push it forward)
  const baseById = new Map(catalog.baseGames.map((g) => [g.id, g]));
  const years: number[] = [];

  for (const c of state.completed) {
    const g = baseById.get(c.gameId);
    if (g) years.push(g.releaseYear);
  }

  if (years.length > 0) {
    return Math.max(...years);
  }

  // Fallback: if addedYears has objects like { year }, try to read it
  const lastAdded =
    (state as any).addedYears?.length
      ? (state as any).addedYears[(state as any).addedYears.length - 1]
      : null;
  if (lastAdded && typeof lastAdded.year === "number") {
    return lastAdded.year;
  }

  // Final fallback
  return catalog.minYear;
}

export function initState(catalog: Catalog): UserState {
  const firstYear = catalog.minYear; // start from earliest year across all data
  const initial = gamesForYearAll(firstYear, catalog, {
    // minimal "fake" state to compute the pool
    name: undefined,
    available: [],
    completed: [],
    addedYears: [],
    currentGen: catalog.gens[0]?.index ?? 1,
    yearCursor: firstYear + 1,
    dynamicExtras: [],
    seriesRatings: {},
    earnedAchievements: [],
    lastEarned: null,
    pcAvg: 0,
    pcRatingsCount: 0,
  } as UserState);

  return {
    name: undefined,
    available: initial.map((g) => g.id),
    completed: [],
    addedYears: initial.length ? [{ gen: 0 as any, year: firstYear }] as any : [],
    currentGen: catalog.gens[0]?.index ?? 1,
    yearCursor: firstYear + 1,
    dynamicExtras: [],
    seriesRatings: {},
    earnedAchievements: [],
    lastEarned: null,
    pcAvg: 0,
    pcRatingsCount: 0,
  };
}

export function ensureYearWave(state: UserState, catalog: Catalog, minVisible = 2) {
  // Build index from BASE console + ALL PC + dynamic extras (so sorting can resolve ids)
  const allKnown: Game[] = [
    ...catalog.baseGames,
    ...(catalog.pcAllGames ?? []),
    ...state.dynamicExtras,
  ];
  const byId: Record<string, Game> = Object.fromEntries(allKnown.map((g) => [g.id, g]));
  const completedSet = new Set(state.completed.map((c) => c.gameId));

  const visibleCount = () => state.available.filter((id) => !completedSet.has(id)).length;

  // Option A: infer "current year" and DO NOT chase dynamic extras beyond it.
  const detectedYear = detectCurrentYear(state, catalog);

  // Advance while we have too few cards OR we haven't reached detectedYear yet.
  while ((visibleCount() <= minVisible - 1 || (state.yearCursor - 1) < detectedYear) &&
         state.yearCursor <= catalog.maxYear) {
    const year = state.yearCursor;

    // Build batch for this year: console base + PC mandatory + dynamic extras (for this year)
    const batch = gamesForYearAll(year, catalog, state).filter(
      (g) => !completedSet.has(g.id) && !state.available.includes(g.id),
    );

    if (batch.length > 0) {
      (state.addedYears as any[]).push({ gen: 0 as any, year });
      state.available.push(...batch.map((g) => g.id));
    }

    state.yearCursor += 1;
  }

  // Remove completed from available
  state.available = state.available.filter((id) => !completedSet.has(id));

  // Stable global ordering: year ASC, then orderIndex DESC, then title ASC
  state.available.sort((a, b) => {
    const ga = byId[a],
      gb = byId[b];
    if (!ga || !gb) return 0;
    if (ga.releaseYear !== gb.releaseYear) return ga.releaseYear - gb.releaseYear;
    return sortWithinYear(ga, gb);
  });
}

export function finishGame(state: UserState, game: Game, rating: number, catalog: Catalog) {
  state.completed.push({ gameId: game.id, rating, completedAt: new Date().toISOString() });
  state.available = state.available.filter((id) => id !== game.id);

  // Do NOT inject extras here (we gate by series average AFTER recompute in the store)
  ensureYearWave(state, catalog);
}

/**
 * Adds the first unseen game in the series to dynamicExtras IFF the series avg >= 8.
 * Only makes sense to call after recomputeSeriesRatings(...).
 */
export function enqueueNextInSeriesIfEligible(state: UserState, catalog: Catalog, series?: string) {
  if (!series) return;

  // ✅ Use "rounded up" rule
  const avg = state.seriesRatings[series];
  if (avg == null || Math.ceil(avg) < 8) return;

  const titles = catalog.seriesMap[series] ?? catalog.pcSeriesMap?.[series];
  if (!titles?.length) return;

  const completedIds = new Set(state.completed.map((c) => c.gameId));

  // Find first title in series user hasn't completed yet
  let next: Game | undefined;
  for (const title of titles) {
    const g = catalog.byTitle[title] as Game | undefined;
    if (!g) continue;
    if (completedIds.has(g.id)) continue;
    next = g;
    break;
  }
  if (!next) return;

  // If the next candidate is a BASE game (console or PC base), don't inject (base shows via year waves)
  const isConsoleBase = catalog.baseGames.some((g) => g.id === next!.id);
  const isPcBase = (catalog.pcBaseGames ?? []).some((g) => g.id === next!.id);
  if (isConsoleBase || isPcBase) return;

  // Push into dynamicExtras even if it's part of extras
  const existsInDynamic = state.dynamicExtras.some((g) => g.id === next!.id);
  if (!existsInDynamic) {
    state.dynamicExtras.push(next!);
  }

  // If that YEAR was already added to the stream, surface it immediately
  const yearDealt = (state.addedYears as any[]).some((y: any) => y.year === next!.releaseYear);
  const notVisible = !state.available.includes(next!.id) && !completedIds.has(next!.id);
  if (yearDealt && notVisible) {
    state.available.push(next!.id);
    ensureYearWave(state, catalog);
  }
}

// --- SERIES AVERAGES ---

export function recomputeSeriesRatings(state: UserState, catalog: Catalog) {
  const allKnown = [...catalog.baseGames, ...(catalog.pcAllGames ?? []), ...state.dynamicExtras];
  const byId: Record<string, Game> = Object.fromEntries(allKnown.map((g) => [g.id, g]));
  const agg: Record<string, { sum: number; n: number }> = {};

  for (const c of state.completed) {
    const g = byId[c.gameId];
    if (!g?.series) continue;
    if (!agg[g.series]) agg[g.series] = { sum: 0, n: 0 };
    agg[g.series].sum += c.rating;
    agg[g.series].n += 1;
  }

  state.seriesRatings = Object.fromEntries(
    Object.entries(agg).map(([series, { sum, n }]) => [series, Number((sum / n).toFixed(2))]),
  );
}

/** Batch helper to call after hydration: push extra titles for all qualifying series (avg >= 8). */
export function enqueueEligibleExtrasFromAverages(state: UserState, catalog: Catalog) {
  for (const [series, avg] of Object.entries(state.seriesRatings)) {
    if (Math.ceil(avg) >= 8) {
      enqueueNextInSeriesIfEligible(state, catalog, series);
    }
  }
}
