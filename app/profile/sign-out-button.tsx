"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={loading}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-slate-900 bg-[#050c14] px-5 py-2.5 text-sm font-medium text-slate-500 shadow-sm transition hover:border-slate-800 hover:bg-[#070f18] hover:text-slate-400 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden />
      )}
      Sign out
    </button>
  );
}
