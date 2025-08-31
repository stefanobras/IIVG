// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Read-only Supabase client for Server Components / RSC.
 * NOTE: This is async because cookies() is async in Next 15+.
 * You must:  const supabase = await createSupabaseServer();
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies(); // <-- important

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        // set/remove are no-ops in RSC (mutations happen in Route Handlers)
        set: () => {},
        remove: () => {},
      },
    }
  );
}
