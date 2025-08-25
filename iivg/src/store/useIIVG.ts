"use client";
import { create } from "zustand";
import type { Catalog, Game, UserState } from "@/lib/types";
import { initState, ensureYearWave, finishGame as finishGameOp, recomputeSeriesRatings } from "@/lib/stream";

type Actions = {
  bootstrap: (catalog: Catalog) => void;
  complete: (game: Game, rating: number, catalog: Catalog) => void;
  setName: (name: string) => void;
};

export const useIIVG = create<UserState & Actions>()((set, get) => ({
  // empty initial; bootstrap fills it
  name: undefined,
  available: [],
  completed: [],
  addedYears: [],
  currentGen: 1,
  yearCursor: 1978,
  dynamicExtras: [],
  seriesRatings: {},

  bootstrap: (catalog) => set((s) => {
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

  complete: (game, rating, catalog) => set((s) => {
    const next = { ...s } as UserState;
    finishGameOp(next, game, rating, catalog);
    recomputeSeriesRatings(next, catalog);
    return next;
  }),

  setName: (name) => set(() => ({ name })),
}));
