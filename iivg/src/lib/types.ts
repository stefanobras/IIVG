export type Game = {
  id: string;
  title: string;
  series?: string;
  seriesIndex?: number;     // 1-based within the series
  console: string;
  releaseYear: number;
  orderIndex: number;       // priority within the home screen
  image?: string;
  custom?: boolean;         // electives
};

export type Completion = {
  gameId: string;
  rating: number;           // 1..10
  completedAt: string;      // ISO
};

export type SeriesEntry = { series: string; games: string[] };

export type Catalog = {
  baseGames: Game[];                           // from all gen*/games.json
  extraGames: Game[];                          // from all gen*/extra.json
  seriesMap: Record<string, string[]>;         // series -> ordered titles
  byTitle: Record<string, Game>;               // title -> Game (from base or extra)
  allGames: Game[];                            // base + extra
  minYear: number;
  maxYear: number;
};

export type UserState = {
  name?: string;
  available: string[];       // gameIds currently on home screen
  completed: Completion[];
  addedYears: number[];      // years already “dealt” onto the home
  yearCursor: number;        // next year to consider (start 1979)
  dynamicExtras: Game[];     // extras discovered via ratings (subset of catalog.extraGames or user-added)
};
