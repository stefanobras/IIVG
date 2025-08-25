"use client";
import { useState } from "react";
import type { Game } from "@/lib/types";

export default function ElectiveForm({
  onAdd,
}: {
  onAdd: (game: Omit<Game, "id"> & { id?: string }, rating: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [consoleName, setConsoleName] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [series, setSeries] = useState("");
  const [seriesIndex, setSeriesIndex] = useState<number | "">("");
  const [orderIndex, setOrderIndex] = useState<number | "">(""); // NEW
  const [rating, setRating] = useState(10);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title || !consoleName || !year) return;

        onAdd(
          {
            title,
            console: consoleName,
            releaseYear: Number(year),
            series: series || undefined,
            seriesIndex: seriesIndex ? Number(seriesIndex) : undefined,
            orderIndex: 999,
          },
          rating
        );

        setTitle("");
        setConsoleName("");
        setYear("");
        setSeries("");
        setSeriesIndex("");
        setOrderIndex("");
        setRating(10);
      }}
      className="rounded-2xl border p-4 space-y-3"
    >
      <div className="font-semibold">Add Elective Course</div>
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded-xl px-3 py-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="border rounded-xl px-3 py-2" placeholder="Console" value={consoleName} onChange={(e) => setConsoleName(e.target.value)} />
        <input className="border rounded-xl px-3 py-2" placeholder="Release year" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value as any)} />
        <input className="border rounded-xl px-3 py-2" placeholder="Series (optional)" value={series} onChange={(e) => setSeries(e.target.value)} />
        <input className="border rounded-xl px-3 py-2" placeholder="Series # (optional)" inputMode="numeric" value={seriesIndex} onChange={(e) => setSeriesIndex(e.target.value as any)} />
        <input className="border rounded-xl px-3 py-2" placeholder="Order index (e.g. 1.5)" inputMode="decimal" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value as any)} />
        <div className="flex items-center gap-3">
          <label className="text-sm">Rating</label>
          <input type="range" min={1} max={10} value={rating} onChange={(e) => setRating(parseInt(e.target.value))} />
          <span className="w-6 text-center text-sm">{rating}</span>
        </div>
      </div>
      <button className="rounded-xl px-3 py-2 border bg-black text-white dark:bg-white dark:text-black">Add elective</button>
    </form>
  );
}
