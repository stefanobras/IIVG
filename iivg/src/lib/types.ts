export type Game = {
  id: string;
  title: string;
  series?: string;
  seriesIndex?: number;
  console: string;
  releaseYear: number;
  orderIndex: number;
  custom?: boolean;
  image?: string;
  gen?: number; // which generation folder (1,2,...)
};

export type Completion = {
  gameId: string;
  rating: number;
  completedAt: string;
};

export type SeriesEntry = { series: string; games: string[] };

export type CatalogGen = { index: number; name: string; minYear: number; maxYear: number };

export type Catalog = {
  baseGames: Game[];
  extraGames: Game[];
  seriesMap: Record<string, string[]>;
  byTitle: Record<string, Game>;
  allGames: Game[];
  gens: CatalogGen[]; // NEW
  minYear: number;
  maxYear: number;
};

export type UserState = {
  name?: string;
  available: string[];
  completed: Completion[];
  addedYears: Array<{ gen: number; year: number }>;
  currentGen: number;
  yearCursor: number;
  dynamicExtras: Game[];
  seriesRatings: Record<string, number>; // NEW
};
