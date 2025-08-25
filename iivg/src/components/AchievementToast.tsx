"use client";
import { achievementsByConsole, hasAnyAchievement } from "@/lib/achievements";
import type { Completion, Game } from "@/lib/types";
import { useEffect, useState } from "react";

export default function AchievementToast({
  completed,
  games,
}: { completed: Completion[]; games: Game[] }) {
  const [visible, setVisible] = useState(false);
  const any = hasAnyAchievement(completed);
  useEffect(() => { setVisible(any); }, [any]);
  if (!visible) return null;

  const rows = achievementsByConsole(completed, games).filter((r) => r.highest);

  return (
    <div className="fixed bottom-4 right-4 rounded-2xl border bg-white dark:bg-zinc-900 shadow-lg p-4 w-80">
      <div className="font-semibold mb-2">Achievements unlocked</div>
      <ul className="text-sm space-y-1">
        {rows.map((r) => (
          <li key={r.console}>
            <span className="font-medium">{r.console}</span>: {r.highest} ({r.count} games)
          </li>
        ))}
      </ul>
      <a href="/achievements" className="mt-3 inline-block text-sm underline">View all</a>
    </div>
  );
}
