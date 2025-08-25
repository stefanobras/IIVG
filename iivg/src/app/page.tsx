import { loadCatalog } from "@/lib/content";
import HomeClient from "@/components/HomeClient";

export default async function Page() {
  const catalog = loadCatalog(); // Node fs on the server
  return <HomeClient catalog={catalog} />;
}
