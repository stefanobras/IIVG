"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useIIVG } from "@/store/useIIVG";
import type { Catalog, Game } from "@/lib/types";
import GameCard from "@/components/GameCard";
import ElectiveForm from "@/components/ElectiveForm";
import AchievementModal from "@/components/AchievementModal";

function sortWithinYear(a: Game, b: Game) {
  if (a.orderIndex !== b.orderIndex) return b.orderIndex - a.orderIndex; // DESC by orderIndex
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

  // Carousel state
  const PAGE_SIZE = 5;
  const [start, setStart] = useState(0); // index of first visible card

  useEffect(() => {
    bootstrap(catalog);
  }, [bootstrap, catalog]);

  // id -> game
  const byId = useMemo(() => {
    const all = [...catalog.allGames, ...dynamicExtras];
    return Object.fromEntries(all.map((g) => [g.id, g])) as Record<string, Game>;
  }, [catalog.allGames, dynamicExtras]);

  // stable ordering: year ASC, then orderIndex DESC, then title ASC
  const sortedAvailable = useMemo(() => {
    return available
      .filter((id) => byId[id])
      .sort((a, b) => {
        const ga = byId[a]!, gb = byId[b]!;
        if (ga.releaseYear !== gb.releaseYear) return ga.releaseYear - gb.releaseYear;
        return sortWithinYear(ga, gb);
      });
  }, [available, byId]);

  const len = sortedAvailable.length;

  // Clamp start when list changes (allow last partial page)
  useEffect(() => {
    if (len === 0) return setStart(0);
    if (start >= len) {
      const lastPageStart = Math.max(0, len - (len % PAGE_SIZE || PAGE_SIZE));
      setStart(lastPageStart);
    }
  }, [len, start]);

  const visibleIds = sortedAvailable.slice(start, start + PAGE_SIZE);
  const canPrev = start > 0;
  const canNext = start + PAGE_SIZE < len;

  // sizing tier based on how many are visible now (unchanged from your style)
  const cols = visibleIds.length || 1;
  const sizeTier = cols >= 5 ? "sm" : cols >= 4 ? "md" : "lg";

  return (
    <main className="min-h-screen">
      {/* NAVBAR */}
      <header className="sticky top-0 z-20 bg-black text-white border-b border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 py-6 flex items-center justify-between">
          {/* Logo + subtitle (stacked) */}
          <div className="flex flex-col items-start">
            <img
              src="/images/logo_2.png"
              alt="IIVG"
              className="h-16 w-auto block"
            />
            <div className="font-subtitle mt-3 text-[14px] leading-none text-zinc-300">
              Complete the following courses and cultivate your video game education.
            </div>
          </div>

          {/* Right-side nav (keep Link for Achievements) */}
          <nav className="flex items-center gap-4">
            <Link
              href="/achievements"
              className="font-header tracking-wide uppercase text-lg underline decoration-transparent hover:decoration-inherit transition-colors hover:text-[var(--iivg-royal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--iivg-royal)] rounded"
            >
              Achievements
            </Link>
          </nav>
        </div>
      </header>

      {/* Graduation modal (unchanged behavior) */}
      <AchievementModal
        record={lastEarned}
        userName={name || "StefanoBras"}
        onClose={dismissAchievement}
      />

      {/* CAROUSEL */}
      <section className="relative max-w-screen-2xl mx-auto py-6">
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
              setStart((s) => {
                const next = s + PAGE_SIZE;
                if (next >= len) {
                  const lastPageStart = Math.max(0, len - (len % PAGE_SIZE || PAGE_SIZE));
                  return lastPageStart; // jump to last partial/full page
                }
                return next;
              })
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

        {/* Side gutters keep arrows away from cards (your spacing) */}
        <div className="px-12 md:px-20 xl:px-28">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {visibleIds.map((id) => {
              const g = byId[id];
              if (!g) return null;
              return (
                <div key={id} className="flex">
                  <GameCard
                    game={g}
                    size={sizeTier as any}
                    onComplete={(rating) => {
                      complete(g, rating, catalog);
                      // After removal, snap to last valid page if we ended up past the end
                      setStart((s) => {
                        const nextLen = Math.max(0, len - 1);
                        const lastStart = Math.max(0, nextLen - (nextLen % PAGE_SIZE || PAGE_SIZE));
                        return s > lastStart ? lastStart : s;
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FLOATING ELECTIVE BUTTON + PANEL */}
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
