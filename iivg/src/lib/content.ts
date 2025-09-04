import fs from "node:fs";
import path from "node:path";
import type { Catalog, Game, SeriesEntry, CatalogGen } from "./types";

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
  const gensFolders = listGenDirs(dataRoot);

  const baseGames: Game[] = [];
  const extraGames: Game[] = [];
  const seriesMap: Record<string, string[]> = {};

  const gensMeta: CatalogGen[] = [];

  for (const genName of gensFolders) {
    const idx = Number(genName.replace(/\D/g, "")) || 0;
    const genDir = path.join(dataRoot, genName);
    const games = safeReadJSON<Game[]>(path.join(genDir, "games.json"), []).map(g => ({ ...g, gen: idx }));
    const series = safeReadJSON<SeriesEntry[]>(path.join(genDir, "series.json"), []);
    const extras = safeReadJSON<Game[]>(path.join(genDir, "extra.json"), []).map(g => ({ ...g, gen: idx }));

    baseGames.push(...games);
    extraGames.push(...extras);

    for (const s of series) {
      if (!seriesMap[s.series]) seriesMap[s.series] = [];
      for (const t of s.games) if (!seriesMap[s.series].includes(t)) seriesMap[s.series].push(t);
    }

    const years = [...games, ...extras].map(g => g.releaseYear);
    if (years.length) gensMeta.push({
      index: idx,
      name: genName,
      minYear: Math.min(...years),
      maxYear: Math.max(...years),
    });
  }

  const byTitle: Record<string, Game> = {};
  for (const g of [...baseGames, ...extraGames]) if (!byTitle[g.title]) byTitle[g.title] = g;

  const allGames = [...baseGames, ...extraGames];
  const years = allGames.map(g => g.releaseYear);
  const minYear = years.length ? Math.min(...years) : 1977;
  const maxYear = years.length ? Math.max(...years) : 1979;

  gensMeta.sort((a, b) => a.index - b.index);

  return { baseGames, extraGames, seriesMap, byTitle, allGames, gens: gensMeta, minYear, maxYear };
}
