// src/app/achievements/page.tsx
import { loadCatalog } from "@/lib/content";
import AchievementsClient from "../../components/AchievementsClient";

export default function Page() {
  const catalog = loadCatalog(); // server-side read
  return <AchievementsClient catalog={catalog} />;
}