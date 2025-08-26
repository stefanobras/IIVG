import type { Completion, Game } from "./types";



export const DEGREE_STEPS = [
{ threshold: 3, label: "Kindergarten Diploma" },
{ threshold: 5, label: "Primary School Diploma" },
{ threshold: 8, label: "Middle School Certificate" },
{ threshold: 10, label: "High School Diploma" },
{ threshold: 13, label: "Associate's Degree" },
{ threshold: 15, label: "Bachelor's Degree" },
{ threshold: 18, label: "Master's Degree" },
{ threshold: 20, label: "PhD" }
] as const;

export function degreeForCount(count: number) {
  const hit = [...DEGREE_STEPS].reverse().find(d => count >= d.threshold);
  return hit?.label;
}

export function degreeIndex(label: string) {
  const i = DEGREE_STEPS.findIndex(d => d.label === label);
  return i >= 0 ? i + 1 : undefined; // 1-based for diploma_1, diploma_2, ...
}

export function achievementsByConsole(
completed: Completion[],
allGames: Game[]
) {
const byConsole: Record<string, Completion[]> = {};
for (const c of completed) {
const g = allGames.find((x) => x.id === c.gameId);
if (!g) continue;
byConsole[g.console] ||= [];
byConsole[g.console].push(c);
}
const result = Object.entries(byConsole).map(([console, list]) => {
const count = list.length;
const highest = [...DEGREE_STEPS].reverse().find((d) => count >= d.threshold);
return { console, count, highest: highest?.label };
});
return result.sort((a, b) => a.console.localeCompare(b.console));
}


export function hasAnyAchievement(completed: Completion[]) {
return completed.length >= DEGREE_STEPS[0].threshold;
}