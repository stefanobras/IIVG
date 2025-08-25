"use client";
import { useState } from "react";
import type { Game } from "@/lib/types";

export default function GameCard({
  game,
  onComplete,
}: { game: Game; onComplete: (rating: number) => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(10);

  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-700">
        {game.image ? (
          <img
            src={game.image}
            alt={game.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.src = "/images/placeholder.jpg"; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-end p-3">
            <div className="text-white text-lg font-semibold drop-shadow">{game.title}</div>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2">
        {!game.image && <div className="text-base font-semibold">{game.title}</div>}
        <div className="text-sm opacity-70">
          {game.console} • {game.releaseYear}
        </div>
        {game.series && (
          <div className="text-xs opacity-70">
            Series: {game.series}{game.seriesIndex ? ` #${game.seriesIndex}` : ""}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            onClick={() => setOpen(true)}  // force it open (no toggle glitches)
            className="rounded-xl px-3 py-2 border transition-colors hover:bg-zinc-100 hover:shadow-sm dark:hover:bg-zinc-800"
          >
            Mark as Completed
          </button>
        </div>

        {open && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <label className="text-sm">Rating:</label>
            <input
              aria-label="Rating"
              type="range"
              min={1}
              max={10}
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
            />
            <span className="w-6 text-center text-sm">{rating}</span>

            <button
              onClick={() => {
                onComplete(rating);     // triggers store logic: remove card, add next year, achievements, series avg, etc.
                setOpen(false);
                setRating(10);
              }}
              className="rounded-xl px-3 py-2 border bg-black text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
            >
              Confirm
            </button>

            <button
              onClick={() => { setOpen(false); setRating(10); }}
              className="rounded-xl px-3 py-2 border transition-colors hover:bg-zinc-100 hover:shadow-sm dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
