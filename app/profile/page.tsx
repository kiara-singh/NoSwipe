import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, UserRound } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-[#fafafa] text-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(120,119,198,0.08),transparent)]"
      />
      <header className="relative z-10 border-b border-zinc-100 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 md:px-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-zinc-900"
          >
            NoSwipe
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-0.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            Home
            <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-6">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-lg shadow-zinc-200/40 md:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900">
                <UserRound className="h-7 w-7" strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  Your profile
                </h1>
                <p className="mt-1 text-sm text-zinc-600">
                  Signed in as{" "}
                  <span className="font-medium text-zinc-900">
                    {user.email ?? "your account"}
                  </span>
                </p>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
                  This is a protected area. Build onboarding, preferences, and
                  match settings here next.
                </p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </main>
    </div>
  );
}
