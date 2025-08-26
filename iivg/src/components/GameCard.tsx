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
    <div className="rounded-2xl border shadow-sm overflow-hidden flex flex-col w-full h-[76svh]">
      {/* BANNER (overlay sits here; does NOT change card size) */}
      <div className="relative h-[70%] bg-gradient-to-br from-zinc-800 to-zinc-700">
        {game.image ? (
          <img
            src={game.image}
            alt={game.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.src = "/images/placeholder.jpg"; }}
          />
        ) : (
          <div className="absolute inset-0" />
        )}

        {/* Overlay controls */}
        {open && (
          <div
            className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-md rounded-xl border border-white/10 bg-black/70 text-white backdrop-blur-md p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-game-title text-lg mb-2">Rate this game</div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm">Rating:</label>
                <input
                  aria-label="Rating"
                  type="range"
                  min={1}
                  max={10}
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value))}
                  style={{ accentColor: "var(--iivg-royal)" }}
                />
                <span className="w-6 text-center text-sm">{rating}</span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => {
                    onComplete(rating);
                    setOpen(false);
                    setRating(10);
                  }}
                  className="rounded-xl px-4 py-2 border text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--iivg-royal)" }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => { setOpen(false); setRating(10); }}
                  className="rounded-xl px-4 py-2 border transition-colors hover:bg-zinc-100 hover:shadow-sm dark:hover:bg-zinc-800 bg-white text-black"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BODY — unchanged sizing (same as your earlier version) */}
      <div className="font-game-body flex-1 p-6 flex flex-col gap-3">
        <div className="font-game-title text-4xl">{game.title}</div>
        <div className="text-xl opacity-70">
          {game.console} • {game.releaseYear}
        </div>
        {game.series && (
          <div className="text-base opacity-70">
            Series: {game.series}{game.seriesIndex ? ` #${game.seriesIndex}` : ""}
          </div>
        )}

        <div className="mt-auto flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl px-4 py-2 border transition-colors hover:bg-zinc-100 hover:shadow-sm dark:hover:bg-zinc-800"
          >
            Mark as Completed
          </button>
        </div>
      </div>
    </div>
  );
}
