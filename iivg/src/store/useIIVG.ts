"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Catalog, Game, UserState } from "@/lib/types";
import { initState, ensureYearWave, finishGame as finishGameOp } from "@/lib/stream";

type Actions = {
  bootstrap: (catalog: Catalog) => void;
  complete: (game: Game, rating: number, catalog: Catalog) => void;
  setName: (name: string) => void;
};

export const useIIVG = create<UserState & Actions>()(
  persist(
    (set, get) => ({
      // empty until bootstrap
      name: undefined,
      available: [],
      completed: [],
      addedYears: [],
      yearCursor: 0,
      dynamicExtras: [],

      bootstrap: (catalog) => set((s) => {
        // Only initialize once; otherwise, just ensure the wave
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
        return next;
      }),

      setName: (name) => set(() => ({ name })),
    }),
    {
      name: "iivg-store",
      version: 2,
      partialize: (s) => ({
        name: s.name,
        available: s.available,
        completed: s.completed,
        addedYears: s.addedYears,
        yearCursor: s.yearCursor,
        dynamicExtras: s.dynamicExtras
      }),
    }
  )
);
