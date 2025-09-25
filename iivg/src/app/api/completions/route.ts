import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ completions: [] });
  }

  const { data, error } = await supabase
    .from("user_completions")
    .select("game_id, rating, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: true });

  // NEW: read user's PC avg (if exists)
  const { data: pcRow } = await supabase
    .from("user_pc_average")
    .select("avg_rating, ratings_count")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ completions: [] });
  }

  return NextResponse.json({
    completions: data.map((r: any) => ({
      gameId: r.game_id as string,
      rating: r.rating as number,
      completedAt: r.completed_at as string,
    })),
    // NEW: reflect current PC average; may be undefined if row doesn’t exist
    pcAvg: pcRow?.avg_rating ?? null,
    pcRatingsCount: pcRow?.ratings_count ?? 0,
  });
}
