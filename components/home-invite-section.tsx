"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon } from "lucide-react";
import { InviteLetter } from "@/components/invite-letter";
import {
  dailyPassesStorageKey,
  wingedInviteDismissedStorageKey,
} from "@/lib/noswipe-demo-storage";

export type HomeInviteMatch = {
  matchedUserId: string;
  dateIdea: string;
  matchReasoning: string;
  matchName: string;
  matchContact: string;
  matchContactPlatform: string;
  matchPhotoUrl: string;
  isWingedMatch?: boolean;
  pitchMessage?: string;
  senderHandle?: string;
};

/** Tracks Pass taps per user + day (2 mock invites). */

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readPassCount(userId: string): number {
  if (typeof window === "undefined" || !userId) return 0;
  try {
    const raw = window.localStorage.getItem(dailyPassesStorageKey(userId));
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { day?: string; count?: number };
    if (parsed.day !== todayKey()) return 0;
    return typeof parsed.count === "number" ? parsed.count : 0;
  } catch {
    return 0;
  }
}

function writePassCount(userId: string, count: number) {
  if (!userId) return;
  window.localStorage.setItem(
    dailyPassesStorageKey(userId),
    JSON.stringify({ day: todayKey(), count }),
  );
}

type HomeInviteSectionProps = {
  /** Supabase auth user id — pass count is scoped so each account has its own daily queue. */
  userId: string;
  matches: [HomeInviteMatch, HomeInviteMatch];
  wingedMatch?: HomeInviteMatch | null;
  wingedMatchToken?: string | null;
  userContactSummary: string;
  senderHandle: string;
  welcomeName?: string | null;
};

export function HomeInviteSection({
  userId,
  matches,
  wingedMatch,
  wingedMatchToken,
  userContactSummary,
  senderHandle,
  welcomeName,
}: HomeInviteSectionProps) {
  const [wingedDismissed, setWingedDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userId) return;
    if (!wingedMatchToken) {
      setWingedDismissed(false);
      return;
    }
    const dismissedToken = window.localStorage.getItem(
      wingedInviteDismissedStorageKey(userId),
    );
    setWingedDismissed(dismissedToken === wingedMatchToken);
  }, [userId, wingedMatchToken]);

  const showingWinged = Boolean(wingedMatch) && !wingedDismissed;

  function onPass() {
    if (showingWinged) {
      if (typeof window !== "undefined" && userId && wingedMatchToken) {
        window.localStorage.setItem(
          wingedInviteDismissedStorageKey(userId),
          wingedMatchToken,
        );
      }
      setWingedDismissed(true);
      return;
    }
    setPassCount((prev) => {
      const fromStorage = readPassCount(userId);
      const base = Math.max(prev, fromStorage);
      const next = Math.min(base + 1, 2);
      writePassCount(userId, next);
      return next;
    });
  }

  const [passCount, setPassCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPassCount(readPassCount(userId));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [userId]);

  const exhausted = passCount >= 2;
  const activeIndex = passCount >= 1 ? 1 : 0;
  const activeMatch = (showingWinged ? wingedMatch : matches[activeIndex]) ?? matches[0];

  const remountKey = useMemo(
    () => `${activeIndex}-${passCount}-${activeMatch.dateIdea.slice(0, 24)}`,
    [activeIndex, passCount, activeMatch.dateIdea],
  );

  const subtitle = showingWinged
    ? "A wingman invite was sent to you and is ready to review first."
    : exhausted
      ? "You've seen both invites for today—they refresh tomorrow morning."
      : "Your next curated date proposal is ready.";

  if (!hydrated) {
    return (
      <div className="flex w-full flex-col items-center">
        <div className="mb-4 w-full text-center md:mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
            Home
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 md:mt-3 md:text-3xl">
            {welcomeName ? `Welcome, ${welcomeName}` : "Your invitations"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 md:mt-2">Loading your queue…</p>
        </div>
        <div className="h-[420px] w-full max-w-3xl animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
      </div>
    );
  }

  if (exhausted && !showingWinged) {
    return (
      <div className="flex w-full flex-col items-center">
        <div className="mb-4 text-center md:mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
            Home
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 md:mt-3 md:text-3xl">
            {welcomeName ? `Welcome, ${welcomeName}` : "Your invitations"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400 md:mt-2">{subtitle}</p>
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
      <div className="mb-4 text-center md:mb-5">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
          Home
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 md:mt-3 md:text-3xl">
          {welcomeName ? `Welcome, ${welcomeName}` : "Your invitations"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400 md:mt-2">{subtitle}</p>
      </div>
    <InviteLetter
      key={remountKey}
      userId={userId}
      senderHandle={senderHandle}
      wingedByHandle={activeMatch.senderHandle}
      matchedUserId={activeMatch.matchedUserId}
      dateIdea={activeMatch.dateIdea}
      matchReasoning={activeMatch.matchReasoning}
      matchName={activeMatch.matchName}
      matchContact={activeMatch.matchContact}
      matchContactPlatform={activeMatch.matchContactPlatform}
      matchPhotoUrl={activeMatch.matchPhotoUrl}
      isWingedMatch={activeMatch.isWingedMatch}
      pitchMessage={activeMatch.pitchMessage}
      userContactSummary={userContactSummary}
      onPass={onPass}
    />
    </div>
  );
}
