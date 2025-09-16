// src/store/useIIVG.ts
"use client";
import { create } from "zustand";
import type { Catalog, Game, UserState, AchievementRecord, Completion } from "@/lib/types";
import {
  initState,
  ensureYearWave,
  finishGame as finishGameOp,
  recomputeSeriesRatings,
  enqueueNextInSeriesIfEligible,
  enqueueEligibleExtrasFromAverages,
} from "@/lib/stream";
import { DEGREE_STEPS, degreeForCount, degreeIndex } from "@/lib/achievements";

type Actions = {
  bootstrap: (catalog: Catalog) => void;
  complete: (game: Game, rating: number, catalog: Catalog) => void;
  setName: (name: string) => void;
  dismissAchievement: () => void;
  attachImageToLastEarned: (dataUrl: string) => void;
  hydrateFromRemote: (rows: Completion[], catalog: Catalog) => void;
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

  complete: (game, rating, catalog) => set((prev) => {
    const next = { ...prev } as UserState;

    // 1) record the completion locally, advance year wave, recompute series
    finishGameOp(next, game, rating, catalog);
    recomputeSeriesRatings(next, catalog);

    // 2) ACHIEVEMENT COUNTING — base games ONLY (extras do NOT count)
    // Build a lookup of BASE games by id, and count only those completions.
    const baseById = Object.fromEntries(catalog.baseGames.map(g => [g.id, g]));

    const consoleName = game.console;
    const currentCount = next.completed.reduce((acc, c) => {
      const g = baseById[c.gameId];
      return (g && g.console === consoleName) ? acc + 1 : acc;
    }, 0);

    // 3) what degree that count corresponds to
    const currentLabel = degreeForCount(currentCount); // e.g., "Kindergarten Diploma"
    const currentIdx = currentLabel ? (degreeIndex(currentLabel) ?? 0) : 0;

    // 4) highest degree previously stored for this console
    const prevBestIdx = Math.max(
      0,
      ...next.earnedAchievements
        .filter(a => a.console === consoleName)
        .map(a => degreeIndex(a.label) ?? 0)
    );

    // 5) if we advanced (and only counting base games), store + show modal
    if (currentIdx > prevBestIdx && currentLabel) {
      const rec = { console: consoleName, label: currentLabel, earnedAt: new Date().toISOString() };
      next.earnedAchievements = [...next.earnedAchievements, rec];
      next.lastEarned = rec;
    }

    // 6) persist remotely (still records ALL games you rate — base or extra)
    try {
      void fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id, rating }),
      });
    } catch {
      // ignore network errors; local state already updated
    }

    // 7) optional: keep your localStorage fallback if you added it earlier
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

      const idx = s.earnedAchievements.findIndex(
        (a) => a.console === con && a.label === label,
      );
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

  hydrateFromRemote: (rows, catalog) => {
    set((prev) => {
      // de-dup against any local completions
      const have = new Set(prev.completed.map((c) => c.gameId));
      const incoming = rows.filter((r) => !have.has(r.gameId));
      if (incoming.length === 0) {
        // Still rebuild wave in case we had stale available items
        const snapshot = { ...prev };
        ensureYearWave(snapshot, catalog);
        return snapshot;
      }

      const next = { ...prev };
      next.completed = [...next.completed, ...incoming];

      // remove completed from available
      const doneIds = new Set(next.completed.map((c) => c.gameId));
      next.available = next.available.filter((id) => !doneIds.has(id));

      // recompute series averages and inject any eligible extra titles
      recomputeSeriesRatings(next, catalog);
      enqueueEligibleExtrasFromAverages(next, catalog);

      // rebuild what's visible
      ensureYearWave(next, catalog);

      // do NOT set lastEarned here (we don't want the modal popping on refresh)
      return next;
    });
  },
}));
