"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";

type Profile = { email?: string | null };

export default function AuthButtons() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted) setProfile(user ? { email: user.email } : null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Load once
    load();

    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setProfile(session?.user ? { email: session.user.email } : null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) return null;

  if (!profile) {
    return (
      <Link
        href="/login"
        className="rounded-md border px-3 py-1.5 hover:bg-white hover:text-black transition"
      >
        Log In / Sign Up
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        className="rounded-md border px-3 py-1.5 hover:bg-white hover:text-black transition"
        onClick={async () => {
          await supabase.auth.signOut();
          // optional: window.location.reload();
        }}
      >
        Sign out
      </button>
    </div>
  );
}
