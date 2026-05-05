"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Moon } from "lucide-react";
import { InviteLetter } from "@/components/invite-letter";

export type HomeInviteMatch = {
  dateIdea: string;
  matchReasoning: string;
  matchName: string;
  matchContact: string;
  matchContactPlatform: string;
  matchPhotoUrl: string;
};

/** Tracks Pass taps today; 2 mock invites per calendar day, then queue is done. */
const STORAGE_KEY = "noswipe_daily_passes";

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readPassCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { day?: string; count?: number };
    if (parsed.day !== todayKey()) return 0;
    return typeof parsed.count === "number" ? parsed.count : 0;
  } catch {
    return 0;
  }
}

function writePassCount(count: number) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ day: todayKey(), count }),
  );
}

type HomeInviteSectionProps = {
  matches: [HomeInviteMatch, HomeInviteMatch];
  userContactSummary: string;
  welcomeName?: string | null;
};

export function HomeInviteSection({
  matches,
  userContactSummary,
  welcomeName,
}: HomeInviteSectionProps) {
  const [passCount, setPassCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPassCount(readPassCount());
    setHydrated(true);
  }, []);

  const exhausted = passCount >= 2;
  const activeIndex = passCount >= 1 ? 1 : 0;
  const activeMatch = matches[activeIndex] ?? matches[0];

  const onPass = useCallback(() => {
    setPassCount((prev) => {
      const fromStorage = readPassCount();
      const base = Math.max(prev, fromStorage);
      const next = Math.min(base + 1, 2);
      writePassCount(next);
      return next;
    });
  }, []);

  const remountKey = useMemo(
    () => `${activeIndex}-${passCount}-${activeMatch.dateIdea.slice(0, 24)}`,
    [activeIndex, passCount, activeMatch.dateIdea],
  );

  const subtitle = exhausted
    ? "You've seen both invites for today—they refresh tomorrow morning."
    : "Your next curated date proposal is ready.";

  if (!hydrated) {
    return (
      <div className="flex w-full flex-col items-center">
        <div className="mb-8 w-full text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
            Home
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
            {welcomeName ? `Welcome, ${welcomeName}` : "Your invitations"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Loading your queue…</p>
        </div>
        <div className="h-[420px] w-full max-w-3xl animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
      </div>
    );
  }

  if (exhausted) {
    return (
      <div className="flex w-full flex-col items-center">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
            Home
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
            {welcomeName ? `Welcome, ${welcomeName}` : "Your invitations"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
        </div>
      <div className="relative w-full max-w-3xl">
        <div className="absolute inset-x-6 top-16 h-52 rounded-b-[2rem] bg-zinc-950/60 blur-2xl" />
        <div className="relative overflow-hidden rounded-3xl border border-zinc-700/70 bg-zinc-900 px-8 py-16 text-center shadow-2xl shadow-black/50">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.08),transparent_55%)]" />
          <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800/80 text-amber-200/90">
              <Moon className="h-7 w-7" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              That&apos;s all for today
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
              Daily queue cleared
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Two hand-picked invites per calendar day—your queue resets at the
              start of each new day.
            </p>
          </div>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
          Home
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
          {welcomeName ? `Welcome, ${welcomeName}` : "Your invitations"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
      </div>
    <InviteLetter
      key={remountKey}
      dateIdea={activeMatch.dateIdea}
      matchReasoning={activeMatch.matchReasoning}
      matchName={activeMatch.matchName}
      matchContact={activeMatch.matchContact}
      matchContactPlatform={activeMatch.matchContactPlatform}
      matchPhotoUrl={activeMatch.matchPhotoUrl}
      userContactSummary={userContactSummary}
      onPass={onPass}
    />
    </div>
  );
}
