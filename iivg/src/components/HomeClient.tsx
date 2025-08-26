"use client";

import { useEffect, useMemo, useState } from "react";
import { useIIVG } from "@/store/useIIVG";
import type { Catalog, Game } from "@/lib/types";
import GameCard from "@/components/GameCard";
import AchievementToast from "@/components/AchievementToast";
import ElectiveForm from "@/components/ElectiveForm";

export default function HomeClient({ catalog }: { catalog: Catalog }) {
  const { available, completed, dynamicExtras, bootstrap, complete } = useIIVG();
  const [showElective, setShowElective] = useState(false);

  useEffect(() => { bootstrap(catalog); }, [bootstrap, catalog]);

  const byId = useMemo(() => {
    const all = [...catalog.allGames, ...dynamicExtras];
    return Object.fromEntries(all.map(g => [g.id, g])) as Record<string, Game>;
  }, [catalog.allGames, dynamicExtras]);

  const count = Math.max(available.filter(id => byId[id]).length, 1);

  return (
    <main className="min-h-screen">
      {/* NAVBAR */}
      {/* NAVBAR */}
      <header className="sticky top-0 z-20 bg-black text-white border-b border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 py-6 flex items-center justify-between">
          {/* Logo + subtitle (stacked) */}
          <div className="flex flex-col items-start">
            <img
              src="/images/logo_2.png"   // your file in /public/images
              alt="IIVG"
              className="h-16 w-auto block"
            />
            <div className="font-subtitle mt-3 text-[14px] leading-none text-zinc-300">
              Complete the following courses and cultivate your video game education.
            </div>
          </div>

          {/* Right-side nav */}
          <nav className="flex items-center gap-4">
            <a
              href="/achievements"
              className="font-header tracking-wide uppercase text-lg underline decoration-transparent hover:decoration-inherit transition-colors hover:text-[var(--iivg-royal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--iivg-royal)] rounded"
            >
              Achievements
            </a>
          </nav>
        </div>
      </header>


      <AchievementToast completed={completed} games={[...catalog.allGames, ...dynamicExtras]} />

      {/* FULL-WIDTH GIANT COLUMNS */}
      <section
        className="max-w-screen-2xl mx-auto px-6 py-4 grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          minHeight: "calc(100svh - 5rem)" /* approx: screen minus navbar */
        }}
      >
        {available.map((id) => {
          const g = byId[id];
          if (!g) return null;
          return (
            <div key={id} className="flex">
              <GameCard
                game={g}
                // make card fill the column height
                onComplete={(rating) => complete(g, rating, catalog)}
              />
            </div>
          );
        })}
      </section>

      {/* FLOATING ELECTIVE BUTTON + PANEL (bottom-left) */}
      <button
        onClick={() => setShowElective(v => !v)}
        className="fixed right-6 bottom-6 rounded-full px-5 py-3 shadow-lg hover:shadow-xl text-white"
        style={{ background: "var(--iivg-royal)" }}
      >
        {showElective ? "Close Elective" : "Add Elective"}
      </button>

      {showElective && (
        <div className="fixed left-6 bottom-24 w-[22rem] max-w-[90vw] rounded-2xl border bg-white shadow-lg p-4">
          <div className="font-semibold mb-2">Add Elective Course</div>
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
        </div>
      )}
    </main>
  );
}
