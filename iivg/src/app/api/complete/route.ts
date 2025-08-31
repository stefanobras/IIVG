import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { loadCatalog } from "@/lib/content";
import { DEGREE_STEPS } from "@/lib/achievements";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const gameId: string | undefined = body?.gameId;
  const rating: number | undefined = body?.rating;

  if (!gameId || !rating) {
    return NextResponse.json({ error: "Missing gameId or rating" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const catalog = loadCatalog();
  const byId = Object.fromEntries(catalog.allGames.map(g => [g.id, g]));
  const game = byId[gameId];
  if (!game) {
    return NextResponse.json({ error: "Unknown gameId" }, { status: 400 });
  }

  // 1) Upsert completion
  {
    const { error } = await supabase
      .from("user_completions")
      .upsert({ user_id: user.id, game_id: gameId, rating, completed_at: new Date().toISOString() }, { onConflict: "user_id,game_id" });
    if (error) {
      return NextResponse.json({ error: "DB upsert failed", detail: error.message }, { status: 500 });
    }
  }

  // Fetch all user's completions (for achievements/series calc)
  const { data: comps, error: compErr } = await supabase
    .from("user_completions")
    .select("game_id, rating")
    .eq("user_id", user.id);
  if (compErr) {
    return NextResponse.json({ error: "DB fetch failed", detail: compErr.message }, { status: 500 });
  }

  // 2) Achievements: count completions for this console and see which thresholds are new
  const consoleName = game.console;
  const idsSameConsole = new Set(catalog.allGames.filter(g => g.console === consoleName).map(g => g.id));
  const countForConsole = (comps || []).filter(c => idsSameConsole.has(c.game_id)).length;

  // Existing achievements for this console
  const { data: existingRows } = await supabase
    .from("user_achievements")
    .select("label")
    .eq("user_id", user.id)
    .eq("console", consoleName);

  const existing = new Set((existingRows || []).map(r => r.label));
  const newlyEarned: string[] = [];
  for (const step of DEGREE_STEPS) {
    if (countForConsole >= step.threshold && !existing.has(step.label)) {
      newlyEarned.push(step.label);
    }
  }

  if (newlyEarned.length) {
    // Insert new rows
    const payload = newlyEarned.map(label => ({
      user_id: user.id,
      console: consoleName,
      label,
      earned_at: new Date().toISOString(),
    }));
    await supabase.from("user_achievements").upsert(payload);
  }

  // 3) Series average (if the game has a series)
  let seriesAvg: { series: string; avg: number } | null = null;
  if (game.series) {
    const idsInSeries = new Set(catalog.allGames.filter(g => g.series === game.series).map(g => g.id));
    const ratings = (comps || []).filter(c => idsInSeries.has(c.game_id)).map(c => c.rating);
    if (ratings.length) {
      const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100;
      seriesAvg = { series: game.series, avg };
      // cache it
      await supabase
        .from("user_series_ratings")
        .upsert({ user_id: user.id, series: game.series, avg_rating: avg, updated_at: new Date().toISOString() });
    }
  }

  return NextResponse.json({
    ok: true,
    newAchievements: newlyEarned,   // array of labels you just earned (if any)
    seriesAvg                         // { series, avg } or null
  });
}
