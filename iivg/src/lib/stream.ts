import type { Catalog, Game, UserState } from "./types";

const START_YEAR = 1979;

function sortWithinYear(a: Game, b: Game) {
  // DESC by orderIndex (bigger shows first)
  if (a.orderIndex !== b.orderIndex) return b.orderIndex - a.orderIndex;
  // tie-break by title
  return a.title.localeCompare(b.title);
}

function gamesForYear(gen: number, year: number, catalog: Catalog, dynamicExtras: Game[]): Game[] {
  const fromBase  = catalog.baseGames.filter(g => g.gen === gen && g.releaseYear === year);
  const fromExtra = dynamicExtras.filter(g => g.gen === gen && g.releaseYear === year);
  return [...fromBase, ...fromExtra].sort(sortWithinYear);
}

export function initState(catalog: Catalog): UserState {
  const firstGen = catalog.gens[0]?.index ?? 1;
  const firstYear = START_YEAR;
  const initial = gamesForYear(firstGen, firstYear, catalog, []);
  return {
    name: undefined,
    available: initial.map(g => g.id),
    completed: [],
    addedYears: initial.length ? [{ gen: firstGen, year: firstYear }] : [],
    currentGen: firstGen,
    yearCursor: firstYear + 1,
    dynamicExtras: [],
    seriesRatings: {},
  };
}

export function ensureYearWave(state: UserState, catalog: Catalog) {
  const allKnown = [...catalog.allGames, ...state.dynamicExtras];
  const byId: Record<string, Game> = Object.fromEntries(allKnown.map(g => [g.id, g]));

  while (state.available.length <= 1) {
    const genMeta = catalog.gens.find(g => g.index === state.currentGen);
    if (!genMeta) break;

    // move to next gen if we passed the end of current gen
    if (state.yearCursor > genMeta.maxYear) {
      const nextGen = catalog.gens.find(g => g.index > state.currentGen);
      if (!nextGen) break; // no more gens
      state.currentGen = nextGen.index;
      state.yearCursor = Math.max(START_YEAR, nextGen.minYear);
      continue;
    }

    // add this year (within current gen)
    const batch = gamesForYear(state.currentGen, state.yearCursor, catalog, state.dynamicExtras)
      .filter(g =>
        !state.completed.some(c => c.gameId === g.id) &&
        !state.available.includes(g.id)
      );

    if (batch.length > 0) {
      state.addedYears.push({ gen: state.currentGen, year: state.yearCursor });
      state.available.push(...batch.map(g => g.id));
    }

    state.yearCursor += 1;

    // If we didn’t add anything and haven’t passed gen maxYear, loop again (next year).
    if (batch.length === 0 && state.yearCursor <= genMeta.maxYear) {
      continue;
    }

    // If we added something, we’ll check loop condition again (<=1)
  }

  // Defensive clean-up: remove completed from available
  state.available = state.available.filter(id => !state.completed.some(c => c.gameId === id));

  // Stable ordering: by (releaseYear ASC) then orderIndex DESC, then title
  state.available.sort((a, b) => {
    const ga = byId[a]; const gb = byId[b];
    if (!ga || !gb) return 0;
    if (ga.releaseYear !== gb.releaseYear) return ga.releaseYear - gb.releaseYear;
    return sortWithinYear(ga, gb);
  });
}

export function finishGame(state: UserState, game: Game, rating: number, catalog: Catalog) {
  state.completed.push({ gameId: game.id, rating, completedAt: new Date().toISOString() });
  state.available = state.available.filter(id => id !== game.id);

  // inject next in the series if rating high
  if (rating >= 8 && game.series) injectNextInSeries(state, game, catalog);

  ensureYearWave(state, catalog);
}

function injectNextInSeries(state: UserState, game: Game, catalog: Catalog) {
  const titles = catalog.seriesMap[game.series || ""];
  if (!titles?.length) return;

  const completedIds = new Set(state.completed.map(c => c.gameId));
  const candidates = titles.filter(t => t !== game.title);

  let next: Game | undefined;
  for (const title of candidates) {
    const found = catalog.byTitle[title];
    if (found && !completedIds.has(found.id)) { next = found; break; }
  }
  if (!next) return;

  const alreadyKnown =
    catalog.allGames.find(g => g.id === next.id) ||
    state.dynamicExtras.find(g => g.id === next.id);

  if (!alreadyKnown) state.dynamicExtras.push(next);

  // If that year has already been dealt for that gen, show now
  const yearDealt = state.addedYears.some(y => y.gen === (next.gen ?? state.currentGen) && y.year === next.releaseYear);
  const notVisible = !state.available.includes(next.id) && !state.completed.some(c => c.gameId === next.id);
  if (yearDealt && notVisible) state.available.push(next.id);
}

// --- SERIES AVERAGES ---

export function recomputeSeriesRatings(state: UserState, catalog: Catalog) {
  const allKnown = [...catalog.allGames, ...state.dynamicExtras];
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
