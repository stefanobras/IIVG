"use client";

import { useEffect, useMemo, useState } from "react";
import { useIIVG } from "@/store/useIIVG";
import type { Catalog, Game } from "@/lib/types";
import GameCard from "@/components/GameCard";
import AchievementModal from "@/components/AchievementModal";
import ElectiveForm from "@/components/ElectiveForm";

function sortWithinYear(a: Game, b: Game) {
  if (a.orderIndex !== b.orderIndex) return b.orderIndex - a.orderIndex; // DESC orderIndex
  return a.title.localeCompare(b.title);
}

export default function HomeClient({ catalog }: { catalog: Catalog }) {
  const {
    available,
    dynamicExtras,
    bootstrap,
    complete,
    lastEarned,
    dismissAchievement,
    name,
  } = useIIVG();

  const [showElective, setShowElective] = useState(false);

  // carousel state
  const PAGE_SIZE = 5;
  const [start, setStart] = useState(0); // index of first visible card

  useEffect(() => {
    bootstrap(catalog);
  }, [bootstrap, catalog]);

  // index: id -> game
  const byId = useMemo(() => {
    const all = [...catalog.allGames, ...dynamicExtras];
    return Object.fromEntries(all.map((g) => [g.id, g])) as Record<string, Game>;
  }, [catalog.allGames, dynamicExtras]);

  // stable ordering: year ASC, then orderIndex DESC, then title ASC
  const sortedAvailable = useMemo(() => {
    return available
      .filter((id) => byId[id])
      .sort((a, b) => {
        const ga = byId[a]!,
          gb = byId[b]!;
        if (ga.releaseYear !== gb.releaseYear) return ga.releaseYear - gb.releaseYear;
        return sortWithinYear(ga, gb);
      });
  }, [available, byId]);

  // clamp page start when list changes
  useEffect(() => {
    const maxStart = Math.max(0, sortedAvailable.length - PAGE_SIZE);
    if (start > maxStart) setStart(maxStart);
  }, [sortedAvailable.length, start]);

  const visibleIds = sortedAvailable.slice(start, start + PAGE_SIZE);
  const canPrev = start > 0;
  const canNext = start + PAGE_SIZE < sortedAvailable.length;

  // sizing tier based on how many are visible
  const cols = visibleIds.length || 1;
  const sizeTier = cols >= 5 ? "sm" : cols >= 4 ? "md" : "lg";

  return (
    <main className="min-h-screen">
      {/* NAVBAR */}
      <header className="sticky top-0 z-20 bg-black text-white border-b border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex flex-col items-start">
            <img src="/images/logo_2.png" alt="IIVG" className="h-16 w-auto block" />
            <div className="font-subtitle mt-3 text-[14px] leading-none text-zinc-300">
              Complete the following courses and cultivate your video game education.
            </div>
          </div>
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

      {/* Graduation modal */}
      <AchievementModal record={lastEarned} userName={name || "Student"} onClose={dismissAchievement} />

      {/* CAROUSEL */}
      <section className="relative max-w-screen-2xl mx-auto px-6 md:px-10 py-6 md:py-8">
        {/* Left Arrow */}
        {canPrev && (
          <button
            aria-label="Previous"
            onClick={() => setStart((s) => Math.max(0, s - PAGE_SIZE))}
            className="
              group
              absolute
              top-1/2 -translate-y-1/2
              -left-6 md:-left-12
              h-12 w-12 md:h-14 md:w-14
              shadow-lg hover:shadow-xl
              hover:scale-
              flex items-center justify-center
              text-9xl
              scale-95 hover:scale-125
              transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--iivg-royal)]
            "
          >
            <span aria-hidden>‹</span>
          </button>
        )}

        {/* Right Arrow */}
        {canNext && (
          <button
            aria-label="Next"
            onClick={() =>
              setStart((s) => Math.min(s + PAGE_SIZE, Math.max(0, sortedAvailable.length - PAGE_SIZE)))
            }
            className="
              group
              absolute
              top-1/2 -translate-y-1/2
              -right-6 md:-right-12
              h-12 w-12 md:h-14 md:w-14
              shadow-lg hover:shadow-xl
              flex items-center justify-center
              scale-95 hover:scale-125
              text-9xl
              transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--iivg-royal)]
            "
          >
            <span aria-hidden>›</span>
          </button>
        )}

        {/* Cards grid — add roomy gap; each cell has inner padding to create visual margin */}
        <div
          className="grid gap-5 md:gap-6"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {visibleIds.map((id) => {
            const g = byId[id];
            if (!g) return null;
            return (
              <div key={id} className="flex p-2 md:p-3"> {/* visual margin around each card */}
                <GameCard
                  game={g}
                  size={sizeTier as any}
                  onComplete={(rating) => {
                    complete(g, rating, catalog);
                    // if last item on the page vanished, shift page left when needed
                    setStart((s) => {
                      const nextLen = Math.max(0, sortedAvailable.length - 1);
                      const maxStart = Math.max(0, nextLen - PAGE_SIZE);
                      return Math.min(s, maxStart);
                    });
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* FLOATING ELECTIVE BUTTON + PANEL (bottom-right) */}
      <button
        onClick={() => setShowElective((v) => !v)}
        className="fixed right-6 bottom-6 rounded-full px-5 py-3 shadow-lg hover:shadow-xl text-white"
        style={{ background: "var(--iivg-royal)" }}
      >
        {showElective ? "Close Elective" : "Add Elective"}
      </button>

      {showElective && (
        <div className="fixed right-6 bottom-24 w-[22rem] max-w-[90vw] rounded-2xl border bg-white shadow-lg p-4">
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
