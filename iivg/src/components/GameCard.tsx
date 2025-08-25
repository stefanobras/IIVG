"use client";
import { useState } from "react";
import type { Game } from "@/lib/types";


export default function GameCard({ game, onComplete }: { game: Game; onComplete: (rating: number) => void; }) {
const [open, setOpen] = useState(false);
const [rating, setRating] = useState(10);


return (
<div className="rounded-2xl border p-4 shadow-sm flex flex-col gap-2">
<div className="text-xl font-semibold">{game.title}</div>
<div className="text-sm opacity-70">{game.console} • {game.releaseYear}</div>
{game.series && (
<div className="text-xs opacity-70">Series: {game.series}{game.seriesIndex ? ` #${game.seriesIndex}` : ""}</div>
)}
<div className="mt-auto flex items-center justify-between gap-3">
<button onClick={() => setOpen((v) => !v)} className="rounded-xl px-3 py-2 border hover:shadow">
Mark completed
</button>
</div>
{open && (
<div className="mt-3 flex items-center gap-3">
<label className="text-sm">Rating:</label>
<input
type="range"
min={1}
max={10}
value={rating}
onChange={(e) => setRating(parseInt(e.target.value))}
/>
<span className="w-6 text-center text-sm">{rating}</span>
<button
onClick={() => { onComplete(rating); setOpen(false); }}
className="rounded-xl px-3 py-2 border bg-black text-white dark:bg-white dark:text-black"
>
Confirm
</button>
</div>
)}
</div>
);
}