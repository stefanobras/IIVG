// src/app/achievements/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AchievementsClient from "@/components/AchievementsClient";
import { loadCatalog } from "@/lib/content";

export default async function Page() {
  const supabase = await createClient();                 // ✅ await
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");                              // or a /login route

  const catalog = loadCatalog();
  return <AchievementsClient catalog={catalog} />;
}
