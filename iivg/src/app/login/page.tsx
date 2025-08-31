"use client";

import { useMemo } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white shadow p-6">
        <h1 className="text-xl text-black font-semibold mb-4">Sign in to IIVG</h1>

        <Auth
          supabaseClient={supabase}
          providers={["google"]}
          redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`}
          appearance={{ theme: ThemeSupa }}
          localization={{
            variables: {
              sign_in: { email_label: "Email", password_label: "Password" },
              sign_up: { email_label: "Email", password_label: "Password" },
            },
          }}
          // Enables both Sign In and Sign Up in tabs
          view="sign_in"
          theme="light"
        />

        <p className="mt-3 text-xs text-zinc-500">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
