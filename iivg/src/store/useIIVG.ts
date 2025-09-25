// src/store/useIIVG.ts
"use client";
import { create } from "zustand";
import type { Catalog, Game, UserState, AchievementRecord, Completion } from "@/lib/types";
import {
  initState,
  ensureYearWave,
  finishGame as finishGameOp,
  recomputeSeriesRatings,
  enqueueEligibleExtrasFromAverages,
} from "@/lib/stream";
import { DEGREE_STEPS, degreeForCount, degreeIndex } from "@/lib/achievements";

type Actions = {
  bootstrap: (catalog: Catalog) => void;
  complete: (game: Game, rating: number, catalog: Catalog) => void;
  setName: (name: string) => void;
  dismissAchievement: () => void;
  attachImageToLastEarned: (dataUrl: string) => void;
  /**
   * Optionally accepts extra info (pcAvg, pcRatingsCount) returned by /api/completions.
   */
  hydrateFromRemote: (
    rows: Completion[],
    catalog: Catalog,
    extra?: { pcAvg?: number | null; pcRatingsCount?: number | null }
  ) => void;
};

function consoleCounts(completed: Completion[], catalog: Catalog, dynamicExtras: Game[]) {
  const byId = Object.fromEntries([...catalog.allGames, ...dynamicExtras].map((g) => [g.id, g]));
  const map: Record<string, number> = {};
  for (const c of completed) {
    const g = byId[c.gameId];
    if (!g) continue;
    map[g.console] = (map[g.console] || 0) + 1;
  }
  return map;
}

function detectNewAchievements(prev: UserState, next: UserState, catalog: Catalog): AchievementRecord[] {
  const before = consoleCounts(prev.completed, catalog, prev.dynamicExtras);
  const after = consoleCounts(next.completed, catalog, next.dynamicExtras);

  const out: AchievementRecord[] = [];
  for (const console of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const cb = before[console] || 0;
    const ca = after[console] || 0;
    if (ca <= cb) continue;

    for (const step of DEGREE_STEPS) {
      if (cb < step.threshold && ca >= step.threshold) {
        out.push({ console, label: step.label, earnedAt: new Date().toISOString() });
      }
    }
  }
  return out;
}

export const useIIVG = create<UserState & Actions>()((set, get) => ({
  name: undefined,
  available: [],
  completed: [],
  addedYears: [],
  currentGen: 1,
  yearCursor: 1979,
  dynamicExtras: [],
  seriesRatings: {},
  earnedAchievements: [],
  lastEarned: null,

  // For PC logic (mandatory/top-ups)
  pcAvg: 0,
  pcRatingsCount: 0,

  bootstrap: (catalog) =>
    set((s) => {
      if (s.available.length === 0 && s.completed.length === 0 && s.addedYears.length === 0) {
        const init = initState(catalog);
        ensureYearWave(init, catalog);
        return init;
      } else {
        const next = { ...s } as UserState;
        ensureYearWave(next, catalog);
        return next;
      }
    }),

  complete: (game, rating, catalog) =>
    set((prev) => {
      const next = { ...prev } as UserState;

      // 1) record locally, advance wave, recompute series
      finishGameOp(next, game, rating, catalog);
      recomputeSeriesRatings(next, catalog);

      // 2) ACHIEVEMENTS — base games ONLY
      const baseById = Object.fromEntries(catalog.baseGames.map((g) => [g.id, g]));
      const consoleName = game.console;
      const currentCount = next.completed.reduce((acc, c) => {
        const g = baseById[c.gameId];
        return g && g.console === consoleName ? acc + 1 : acc;
      }, 0);

      const currentLabel = degreeForCount(currentCount);
      const currentIdx = currentLabel ? (degreeIndex(currentLabel) ?? 0) : 0;

      const prevBestIdx = Math.max(
        0,
        ...next.earnedAchievements
          .filter((a) => a.console === consoleName)
          .map((a) => degreeIndex(a.label) ?? 0),
      );

      if (currentIdx > prevBestIdx && currentLabel) {
        const rec = { console: consoleName, label: currentLabel, earnedAt: new Date().toISOString() };
        next.earnedAchievements = [...next.earnedAchievements, rec];
        next.lastEarned = rec;
      }

      // 3) persist remotely; capture pcAvg if API returns it (for PC logic)
      (async () => {
        try {
          const res = await fetch("/api/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId: game.id, rating }),
          });
          if (res.ok) {
            const json = await res.json().catch(() => null);
            if (json && typeof json.pcAvg === "number") {
              useIIVG.setState((state) => ({
                ...state,
                pcAvg: json.pcAvg,
                pcRatingsCount: Number(json.pcRatingsCount || 0),
              }));
              // After updating pcAvg, rebuild the wave to allow PC top-ups
              const snap = { ...useIIVG.getState() } as UserState;
              ensureYearWave(snap, catalog);
              useIIVG.setState(snap);
            }
          }
        } catch {
          // ignore
        }
      })();

      // 4) optional: localStorage fallback
      try {
        const key = "iivg_completions";
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ gameId: game.id, rating, completedAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(arr));
      } catch {}

      return next;
    }),

  setName: (name) => set(() => ({ name })),
  dismissAchievement: () => set(() => ({ lastEarned: null })),

  attachImageToLastEarned: (dataUrl) =>
    set((s) => {
      if (!s.lastEarned) return s;
      const { console: con, label } = s.lastEarned;

      const idx = s.earnedAchievements.findIndex((a) => a.console === con && a.label === label);
      if (idx >= 0 && s.earnedAchievements[idx].imageDataUrl) return s;

      const earned = [...s.earnedAchievements];
      if (idx >= 0) {
        earned[idx] = { ...earned[idx], imageDataUrl: dataUrl };
      } else {
        earned.push({ ...s.lastEarned, imageDataUrl: dataUrl });
      }

      return {
        earnedAchievements: earned,
        lastEarned: { ...s.lastEarned, imageDataUrl: dataUrl },
      };
    }),

  hydrateFromRemote: (rows, catalog, extra) => {
    set((prev) => {
      const next = { ...prev } as UserState;

      // Sync PC average from /api/completions if provided
      if (extra && typeof extra.pcAvg === "number") next.pcAvg = extra.pcAvg!;
      if (extra && typeof extra.pcRatingsCount === "number") next.pcRatingsCount = extra.pcRatingsCount!;

      // de-dup against any local completions
      const have = new Set(next.completed.map((c) => c.gameId));
      const incoming = rows.filter((r) => !have.has(r.gameId));
      if (incoming.length === 0) {
        ensureYearWave(next, catalog);
        return next;
      }

      next.completed = [...next.completed, ...incoming];

      // remove completed from available
      const doneIds = new Set(next.completed.map((c) => c.gameId));
      next.available = next.available.filter((id) => !doneIds.has(id));

      // recompute series averages and inject any eligible extra titles
      recomputeSeriesRatings(next, catalog);
      enqueueEligibleExtrasFromAverages(next, catalog);

      // rebuild wave (clamped by detected current year)
      ensureYearWave(next, catalog);

      return next; // don't pop modal on refresh
    });
  },
}));
