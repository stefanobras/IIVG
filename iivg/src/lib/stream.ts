import type { Catalog, Game, UserState } from "./types";

const START_YEAR = 1979;

function sortWithinYear(a: Game, b: Game) {
  if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
  if (a.releaseYear !== b.releaseYear) return a.releaseYear - b.releaseYear;
  return a.title.localeCompare(b.title);
}

function gamesForYear(
  year: number,
  catalog: Catalog,
  dynamicExtras: Game[]
): Game[] {
  const fromBase = catalog.baseGames.filter(g => g.releaseYear === year);
  const fromExtras = dynamicExtras.filter(g => g.releaseYear === year);
  return [...fromBase, ...fromExtras].sort(sortWithinYear);
}

// Initialize: deal the first year (1979) to the home screen
export function initState(catalog: Catalog): UserState {
  const firstYear = Math.max(START_YEAR, catalog.minYear || START_YEAR);
  const initial = gamesForYear(firstYear, catalog, []);
  return {
    name: undefined,
    available: initial.map(g => g.id),
    completed: [],
    addedYears: [firstYear],
    yearCursor: firstYear + 1,
    dynamicExtras: [],
  };
}

// Add next year(s) until > 1 game is available (or no more years)
export function ensureYearWave(state: UserState, catalog: Catalog) {
  const byId = Object.fromEntries(
    catalog.allGames.concat(state.dynamicExtras).map(g => [g.id, g])
  );

  while (state.available.length <= 1 && state.yearCursor <= catalog.maxYear) {
    const year = state.yearCursor;
    const batch = gamesForYear(year, catalog, state.dynamicExtras)
      .filter(g =>
        !state.completed.some(c => c.gameId === g.id) &&
        !state.available.includes(g.id)
      );

    if (batch.length > 0) {
      state.addedYears.push(year);
      state.available.push(...batch.map(g => g.id));
    }
    state.yearCursor += 1;
  }

  // Remove any completed from available (defensive)
  state.available = state.available.filter(id => !state.completed.some(c => c.gameId === id));

  // maintain stable ordering across years (by (releaseYear, orderIndex, title))
  state.available.sort((a, b) => {
    const ga = byId[a]; const gb = byId[b];
    if (!ga || !gb) return 0;
    if (ga.releaseYear !== gb.releaseYear) return ga.releaseYear - gb.releaseYear;
    return sortWithinYear(ga, gb);
  });
}

// When a game finishes
export function finishGame(
  state: UserState,
  game: Game,
  rating: number,
  catalog: Catalog
) {
  state.completed.push({ gameId: game.id, rating, completedAt: new Date().toISOString() });
  state.available = state.available.filter(id => id !== game.id);

  if (rating >= 8 && game.series) {
    injectNextInSeries(state, game, catalog);
  }

  ensureYearWave(state, catalog);
}

// Find the first not-completed game in the same series (using seriesMap),
// prefer exact title from base/extra; if it exists in a future year, it will
// appear when that year is dealt. If its year is already dealt, add it now.
function injectNextInSeries(state: UserState, game: Game, catalog: Catalog) {
  const titles = catalog.seriesMap[game.series || ""];
  if (!titles || titles.length === 0) return;

  // Find the “first not completed in the series” (excluding the one just finished)
  const completedIds = new Set(state.completed.map(c => c.gameId));
  const currentTitle = game.title;
  const candidates = titles.filter(t => t !== currentTitle);

  let next: Game | undefined;
  for (const title of candidates) {
    const found = catalog.byTitle[title];
    if (found && !completedIds.has(found.id)) { next = found; break; }
  }

  if (!next) return;

  // If next only exists in extra.json, add it to dynamicExtras
  const alreadyKnown = catalog.allGames.find(g => g.id === next!.id)
    || state.dynamicExtras.find(g => g.id === next!.id);

  if (!alreadyKnown) {
    state.dynamicExtras.push(next);
  }

  // If that year's already on the board, add it immediately; otherwise it will appear when the year is dealt
  const yearAlreadyDealt = state.addedYears.includes(next.releaseYear);
  const notVisibleYet = !state.available.includes(next.id) && !state.completed.some(c => c.gameId === next!.id);

  if (yearAlreadyDealt && notVisibleYet) {
    state.available.push(next.id);
  }
}
