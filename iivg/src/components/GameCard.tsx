"use client";
import { useState } from "react";
import type { Game } from "@/lib/types";

type SizeTier = "lg" | "md" | "sm" | "xs" | "xxs";

export default function GameCard({
  game,
  onComplete,
  size = "lg",
}: {
  game: Game;
  onComplete: (rating: number) => void;
  size?: SizeTier;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(10);

  // 1 → red … 10 → green (for slider & chip)
  const hue = Math.round(((rating - 1) / 9) * 120);
  const grade = `hsl(${hue} 90% 40%)`;

  // Typography / spacing per size tier
  const titleCls = { lg: "text-4xl", md: "text-3xl", sm: "text-2xl", xs: "text-xl", xxs: "text-lg" }[size];
  const consoleCls = { lg: "text-xl", md: "text-lg", sm: "text-base", xs: "text-sm", xxs: "text-xs" }[size];
  const seriesCls = { lg: "text-base", md: "text-sm", sm: "text-sm", xs: "text-xs", xxs: "text-xs" }[size];
  const bodyPad = { lg: "p-6", md: "p-5", sm: "p-4", xs: "p-3", xxs: "p-2" }[size];
  const bannerH = { lg: "h-[70%]", md: "h-[65%]", sm: "h-[60%]", xs: "h-[55%]", xxs: "h-[50%]" }[size];
  const btnPad = { lg: "px-4 py-2", md: "px-3.5 py-2", sm: "px-3 py-1.5", xs: "px-2.5 py-1.5 text-sm", xxs: "px-2 py-1 text-xs" }[size];

  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden flex flex-col w-full h-[80svh]">
      {/* BANNER with overlay */}
      <div className={`relative ${bannerH} bg-gradient-to-br from-zinc-800 to-zinc-700`}>
        {game.image ? (
          <img
            src={game.image}
            alt={game.title}
            className="h-full w-full object-scale-down"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/images/placeholder.jpg";
            }}
          />
        ) : (
          <div className="absolute inset-0" />
        )}

        {/* Rating overlay (responsive & no overflow) */}
        {open && (
          <div
            className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm flex p-2"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                onComplete(rating);
                setOpen(false);
                setRating(10);
              }}
              className="m-auto w-[min(92%,28rem)] max-h-[90%] overflow-auto rounded-xl border border-white/10 bg-black/70 text-white backdrop-blur-md p-3 sm:p-4"
            >
              <div className="font-game-title text-base sm:text-lg mb-2">Rate this game</div>
              
              {/* Controls: stack on tight widths */}
              <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr,auto] items-center gap-2 sm:gap-3 min-w-0">
                <label className="text-xs sm:text-sm">Rating</label>

                <input
                  aria-label="Rating"
                  type="range"
                  min={1}
                  max={10}
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value))}
                  className="w-full"
                  style={{ accentColor: grade }}
                />

                <span
                  className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs sm:text-sm font-semibold text-white tabular-nums min-w-[2ch]"
                  style={{ backgroundColor: grade }}
                >
                  {rating}
                </span>
              </div>

              {/* Actions: stack on mobile, inline otherwise */}
              <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  type="submit"
                  className="rounded-xl px-4 py-2 border text-white transition-opacity hover:opacity-90 w-full sm:w-auto"
                  style={{ background: "var(--iivg-royal)" }}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setRating(10);
                  }}
                  className="rounded-xl px-4 py-2 border bg-white text-black transition-colors hover:bg-zinc-100 w-full sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className={`font-game-body flex-1 ${bodyPad} flex flex-col gap-3`}>
        <div className={`font-game-title ${titleCls}`}>{game.title}</div>
        <div className={`${consoleCls} opacity-70`}>
          {game.console} • {game.releaseYear}
        </div>
        {game.series && (
          <div className={`${seriesCls} opacity-70`}>
            Series: {game.series}
            {game.seriesIndex ? ` #${game.seriesIndex}` : ""}
          </div>
        )}

        <div className="mt-auto flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className={`rounded-xl border transition-colors hover:bg-zinc-100 hover:shadow-sm dark:hover:bg-zinc-800 ${btnPad}`}
          >
            Mark as Completed
          </button>
        </div>
      </div>
    </div>
  );
}
