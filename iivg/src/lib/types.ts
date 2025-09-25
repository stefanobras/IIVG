// src/lib/types.ts

// ---- Core domain types ----
export type CatalogGen = {
  index: number;
  name: string;
  minYear: number;
  maxYear: number;
};

export type SeriesEntry = {
  series: string;
  games: string[]; // ordered list of titles
};

export type Game = {
  id: string;
  title: string;
  console: string;
  releaseYear: number;
  orderIndex: number;
  gen?: number;
  series?: string;
  seriesIndex?: number | null;
  image?: string;            
  custom?: boolean;
  pcRank?: number;
};

export type Completion = {
  gameId: string;
  rating: number;
  completedAt: string; // ISO
};

export type AchievementRecord = {
  console: string;
  label: string;
  earnedAt: string;        // ISO
  imageDataUrl?: string;   // set after diploma render/save
};

// ---- Catalog assembled by loader ----
export type Catalog = {
  baseGames: Game[];                     // all console base titles (achievements count these only)
  extraGames: Game[];                    // console extras (don’t count for achievements)
  allGames: Game[];                      // base + extra + PC (if present)
  byTitle: Record<string, Game>;
  seriesMap: Record<string, string[]>;   // console series map
  gens: CatalogGen[];
  minYear: number;
  maxYear: number;

  // PC collections (present if /data/pc exists)
  pcBaseGames?: Game[];                  // first 20 mandatory PC titles
  pcExtraGames?: Game[];                 // remaining PC titles (to top up)
  pcAllGames?: Game[];                   // pcBaseGames + pcExtraGames
  pcSeriesMap?: Record<string, string[]>;// PC series map
};

// ---- Zustand state ----
export type UserState = {
  name?: string;

  // Main stream
  available: string[];                   // ids to display (console + PC as injected by stream)
  completed: Completion[];
  addedYears: number[];
  currentGen: number;
  yearCursor: number;

  // Extras & series
  dynamicExtras: Game[];                 // injected extras (including PC sequels)
  seriesRatings: Record<string, number>;

  // Achievements
  earnedAchievements: AchievementRecord[];
  lastEarned: AchievementRecord | null;

  // NEW: PC average cache for topping-up mandatory 20
  pcAvg?: number;                        // last known user PC average (rounded to 2 decimals)
  pcRatingsCount?: number;               // how many PC ratings contributed
};
