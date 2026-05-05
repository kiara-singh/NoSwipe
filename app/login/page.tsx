"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Heart, Loader2, Lock, Mail } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
        return;
      }
      setMessage("Check your email to confirm your account, then sign in.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center bg-[#fafafa] px-4 py-16 text-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(120,119,198,0.1),transparent)]"
      />
      <div className="relative w-full max-w-[400px]">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-xl shadow-zinc-200/50">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md">
              <Heart className="h-6 w-6" strokeWidth={2} aria-hidden />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              {mode === "signin"
                ? "Sign in to continue to NoSwipe."
                : "Start meeting people with intention."}
            </p>
          </div>

          <div className="mb-6 flex rounded-full bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                mode === "signin"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-zinc-700"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-3 text-sm outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:ring-4"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-zinc-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-3 text-sm outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:ring-4"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error ? (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-md transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Please wait
                </>
              ) : mode === "signin" ? (
                "Continue"
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          By continuing you agree to respectful use of NoSwipe.
        </p>
      </div>
    </div>
  );
}
