// src/app/api/completions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ completions: [] });
  }

  const { data, error } = await supabase
    .from("user_completions")       // 👈 correct table
    .select("game_id, rating, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: true });

  if (error || !data) {
    return NextResponse.json({ completions: [] });
  }

  return NextResponse.json({
    completions: data.map((r: any) => ({
      gameId: r.game_id as string,
      rating: r.rating as number,
      completedAt: r.completed_at as string,
    })),
  });
}
