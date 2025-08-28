// src/components/AchievementsClient.tsx
"use client";

import { useMemo } from "react";
import { useIIVG } from "@/store/useIIVG";
import type { Catalog, AchievementRecord } from "@/lib/types";
import { degreeIndex } from "@/lib/achievements";
import DiplomaPreview from "./DiplomaPreview";
import Link from "next/link";

export default function AchievementsClient({ catalog }: { catalog: Catalog }) {
  const { earnedAchievements, name } = useIIVG();

  // Keep only the highest diploma per console
  const topByConsole = useMemo(() => {
    const best = new Map<string, AchievementRecord>();
    for (const rec of earnedAchievements) {
      const prev = best.get(rec.console);
      const curIdx = degreeIndex(rec.label) ?? 0;
      const prevIdx = prev ? (degreeIndex(prev.label) ?? 0) : -1;
      if (!prev || curIdx > prevIdx) best.set(rec.console, rec);
    }
    return Array.from(best.values());
  }, [earnedAchievements]);

  // Map console -> generation index (from catalog games)
  const consoleGen = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of catalog.allGames) {
      const gen = g.gen ?? 1;
      if (!map.has(g.console)) map.set(g.console, gen);
      // If a console appears in multiple gens, pick the MAX (latest)
      else map.set(g.console, Math.max(map.get(g.console)!, gen));
    }
    return map;
  }, [catalog.allGames]);

  // Group top diplomas by generation (latest gen first)
  const groups = useMemo(() => {
    const m = new Map<number, AchievementRecord[]>();
    for (const rec of topByConsole) {
      const gen = consoleGen.get(rec.console) ?? 1;
      if (!m.has(gen)) m.set(gen, []);
      m.get(gen)!.push(rec);
    }
    // sort each row alphabetically by console
    for (const [k, arr] of m) arr.sort((a, b) => a.console.localeCompare(b.console));
    return Array.from(m.entries())
      .sort((a, b) => b[0] - a[0]); // latest gen first
  }, [topByConsole, consoleGen]);

  return (
    <main className="min-h-screen">
      {/* NAVBAR (same as Home) */}
      <header className="sticky top-0 z-20 bg-black text-white border-b border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex flex-col items-start">
            <img src="/images/logo_2.png" alt="IIVG" className="h-16 w-auto block" />
            <div className="font-subtitle mt-3 text-[14px] leading-none text-zinc-300">
              Review your earned diplomas by console.
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="font-header tracking-wide uppercase text-lg underline decoration-transparent hover:decoration-inherit transition-colors hover:text-[var(--iivg-royal)]"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-screen-2xl mx-auto px-6 py-8 space-y-10">
        {groups.length === 0 && (
          <div className="text-center text-zinc-600">
            No diplomas yet. Complete courses to earn your first certificate!
          </div>
        )}

        {groups.map(([gen, recs]) => (
          <div key={gen} className="space-y-4">
            {/* Generation breakpoint */}
            <div className="text-sm uppercase tracking-wide text-zinc-500">
              Generation {gen}
            </div>

            {/* Row of diplomas for this generation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recs.map((rec) => (
                <div key={`${rec.console}-${rec.label}`} className="rounded-2xl border bg-black shadow-sm p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="font-header text-lg">{rec.console}</div>
                    <div className="font-game-body text-xs text-white">{rec.label}</div>
                  </div>
                  {rec.imageDataUrl ? (
                    <img
                      src={rec.imageDataUrl}
                      alt={`${rec.console} — ${rec.label}`}
                      className="w-full h-auto rounded-lg border"
                    />
                  ) : (
                    <DiplomaPreview record={rec} userName={name || "Student"} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
