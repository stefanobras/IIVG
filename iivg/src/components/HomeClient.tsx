"use client";

import { useEffect, useMemo, useState } from "react";
import { useIIVG } from "@/store/useIIVG";
import type { Catalog, Game } from "@/lib/types";
import GameCard from "@/components/GameCard";
import AchievementToast from "@/components/AchievementToast";
import ElectiveForm from "@/components/ElectiveForm";

export default function HomeClient({ catalog }: { catalog: Catalog }) {
  const { available, completed, dynamicExtras, bootstrap, complete, name, setName } = useIIVG();
  const [showElective, setShowElective] = useState(false); // NEW

  useEffect(() => { bootstrap(catalog); }, [bootstrap, catalog]);

  const byId = useMemo(() => {
    const all = [...catalog.allGames, ...dynamicExtras];
    return Object.fromEntries(all.map(g => [g.id, g])) as Record<string, Game>;
  }, [catalog.allGames, dynamicExtras]);

  const hasGames = available.some((id) => byId[id]);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Internet Institute of Video Games</h1>
          <p className="opacity-70 text-sm">
            Finish, rate, and progress year-by-year. High ratings queue series extras.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Your name (optional)"
            value={name || ""}
            onChange={(e) => setName(e.target.value)}
          />
          <a className="underline text-sm" href="/achievements">Achievements</a>
        </div>
      </header>

      <AchievementToast completed={completed} games={[...catalog.allGames, ...dynamicExtras]} />

      {/* Games grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {available.map((id) => {
          const g = byId[id];
          if (!g) return null;
          return (
            <GameCard
              key={id}
              game={g}
              onComplete={(rating) => complete(g, rating, catalog)}
            />
          );
        })}
      </section>

      {!hasGames && (
        <div className="text-sm opacity-70">
          No games available yet. Check <code>data/gen1/games.json</code> and confirm there are entries for the starting year (1979).
        </div>
      )}

      {/* Add Elective toggle + form */}
      <section className="space-y-3">
        <button
          onClick={() => setShowElective((v) => !v)}
          className="rounded-xl px-3 py-2 border hover:shadow"
        >
          {showElective ? "Close elective form" : "Add an Elective"}
        </button>

        {showElective && (
          <ElectiveForm
            onAdd={(g, r) => {
              const id = g.id || `elective-${Date.now()}`;
              const elective = { ...g, id, custom: true } as Game;
              const state = useIIVG.getState();
              state.dynamicExtras.push(elective);
              state.completed.push({ gameId: id, rating: r, completedAt: new Date().toISOString() });
              useIIVG.setState({ ...state });
            }}
          />
        )}
      </section>
    </main>
  );
}
