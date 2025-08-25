import fs from "node:fs";
import path from "node:path";
import type { Catalog, Game, SeriesEntry } from "./types";

function safeReadJSON<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as T; }
  catch { return fallback; }
}

function listGenDirs(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^gen\d+$/i.test(e.name))
    .map(e => e.name)
    .sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")));
}

export function loadCatalog(dataRoot = path.join(process.cwd(), "data")): Catalog {
  const gens = listGenDirs(dataRoot);

  const baseGames: Game[] = [];
  const extraGames: Game[] = [];
  const seriesMap: Record<string, string[]> = {};

  for (const gen of gens) {
    const genDir = path.join(dataRoot, gen);
    const games = safeReadJSON<Game[]>(path.join(genDir, "games.json"), []);
    const series = safeReadJSON<SeriesEntry[]>(path.join(genDir, "series.json"), []);
    const extras = safeReadJSON<Game[]>(path.join(genDir, "extra.json"), []);

    baseGames.push(...games);
    extraGames.push(...extras);

    for (const s of series) {
      if (!seriesMap[s.series]) seriesMap[s.series] = [];
      // append while keeping order unique
      for (const t of s.games) {
        if (!seriesMap[s.series].includes(t)) seriesMap[s.series].push(t);
      }
    }
  }

  // index by title (base first; extras can fill gaps)
  const byTitle: Record<string, Game> = {};
  for (const g of [...baseGames, ...extraGames]) {
    if (!byTitle[g.title]) byTitle[g.title] = g;
  }

  const allGames = [...baseGames, ...extraGames];
  const years = allGames.map(g => g.releaseYear);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  return { baseGames, extraGames, seriesMap, byTitle, allGames, minYear, maxYear };
}
