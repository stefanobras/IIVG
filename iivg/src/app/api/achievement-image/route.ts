import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { console: consoleName, label, imageUrl } = await req.json();

  if (!consoleName || !label || !imageUrl) {
    return NextResponse.json({ error: "Missing console/label/imageUrl" }, { status: 400 });
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

  const { error } = await supabase
    .from("user_achievements")
    .update({ image_url: imageUrl })
    .eq("user_id", user.id)
    .eq("console", consoleName)
    .eq("label", label);

  if (error) {
    return NextResponse.json({ error: "DB update failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
