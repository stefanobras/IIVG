import { createSupabaseBrowser } from "./client";

function dataUrlToBlob(dataUrl: string) {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || "image/png";
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function uploadDiplomaAndSaveURL(record: { console: string; label: string }, dataUrl: string) {
  const supabase = createSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const blob = dataUrlToBlob(dataUrl);

  const safe = (s: string) => s.replace(/[^a-z0-9-_]/gi, "_");
  const path = `${user.id}/${safe(record.console)}__${safe(record.label)}.png`;

  const { error: upErr } = await supabase
    .storage
    .from("diplomas")
    .upload(path, blob, { upsert: true, contentType: "image/png" });

  if (upErr) return null;

  const { data: pub } = supabase.storage.from("diplomas").getPublicUrl(path);
  const imageUrl = pub.publicUrl;

  await fetch("/api/achievement-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ console: record.console, label: record.label, imageUrl })
  });

  return imageUrl;
}
