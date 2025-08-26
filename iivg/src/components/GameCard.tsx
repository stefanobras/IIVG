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

  // Typography / spacing map per tier
  const titleCls = {
    lg: "text-4xl", md: "text-3xl", sm: "text-2xl", xs: "text-xl", xxs: "text-lg",
  }[size];

  const consoleCls = {
    lg: "text-xl", md: "text-lg", sm: "text-base", xs: "text-sm", xxs: "text-xs",
  }[size];

  const seriesCls = {
    lg: "text-base", md: "text-sm", sm: "text-sm", xs: "text-xs", xxs: "text-xs",
  }[size];

  const bodyPad = {
    lg: "p-6", md: "p-5", sm: "p-4", xs: "p-3", xxs: "p-2",
  }[size];

  const bannerH = {
    lg: "h-[70%]", md: "h-[65%]", sm: "h-[60%]", xs: "h-[55%]", xxs: "h-[50%]",
  }[size];

  const btnPad = {
    lg: "px-4 py-2", md: "px-3.5 py-2", sm: "px-3 py-1.5", xs: "px-2.5 py-1.5 text-sm", xxs: "px-2 py-1 text-xs",
  }[size];

  const overlayMaxW = {
    lg: "max-w-md", md: "max-w-sm", sm: "max-w-[18rem]", xs: "max-w-[16rem]", xxs: "max-w-[14rem]",
  }[size];

  const overlayText = {
    lg: "text-base", md: "text-sm", sm: "text-sm", xs: "text-xs", xxs: "text-xs",
  }[size];

  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden flex flex-col w-full h-[76svh]">
      {/* BANNER with overlay */}
      <div className={`relative ${bannerH} bg-gradient-to-br from-zinc-800 to-zinc-700`}>
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

        {/* Overlay: scales with tier, never overflows the column */}
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

              {/* Rating row with colored chip */}
              <RatingRow rating={rating} onChange={setRating} />

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => { onComplete(rating); setOpen(false); setRating(10); }}
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

      {/* BODY (keeps your original look, just scales with tier) */}
      <div className={`font-game-body flex-1 ${bodyPad} flex flex-col gap-3`}>
        <div className={`font-game-title ${titleCls}`}>{game.title}</div>
        <div className={`${consoleCls} opacity-70`}>
          {game.console} • {game.releaseYear}
        </div>
        {game.series && (
          <div className={`${seriesCls} opacity-70`}>
            Series: {game.series}{game.seriesIndex ? ` #${game.seriesIndex}` : ""}
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

function hueForRating(r: number) {
  // clamp 1..10 (if you ever switch to 0..10 it still works)
  const v = Math.max(0, Math.min(10, r));
  // 0→red(0°), 10→green(120°)
  return Math.round((v / 10) * 120);
}

function colorForRating(r: number) {
  const h = hueForRating(r);
  // spicy & legible — tweak S/L if you like
  return `hsl(${h} 80% 35%)`;
}

function RatingRow({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (n: number) => void;
}) {
  const bg = colorForRating(rating);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="text-sm">Rating:</label>

      {/* Slider; the thumb color follows the rating */}
      <input
        aria-label="Rating"
        type="range"
        min={1}
        max={10}
        value={rating}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ accentColor: bg }}
      />

      {/* Colored chip */}
      <span
        className="min-w-[2.2rem] text-center text-sm font-semibold rounded-md px-2 py-1"
        style={{ background: bg, color: "#fff" }}
      >
        {rating}
      </span>
    </div>
  );
}
