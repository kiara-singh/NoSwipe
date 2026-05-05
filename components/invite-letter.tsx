"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { formatContactLine } from "@/lib/contact-platforms";
import { upcomingDatesStorageKey } from "@/lib/noswipe-demo-storage";

type InviteLetterProps = {
  userId: string;
  dateIdea: string;
  matchReasoning: string;
  matchName: string;
  matchContact: string;
  matchContactPlatform: string;
  matchPhotoUrl: string;
  userContactSummary: string;
  onPass?: () => void;
};

export function InviteLetter({
  userId,
  dateIdea,
  matchReasoning,
  matchName,
  matchContact,
  matchContactPlatform,
  matchPhotoUrl,
  userContactSummary,
  onPass,
}: InviteLetterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isMatched, setIsMatched] = useState(false);

  function onAccept() {
    setIsAccepting(true);
    setTimeout(() => {
      const key = upcomingDatesStorageKey(userId);
      const existing =
        typeof window !== "undefined" && userId
          ? window.localStorage.getItem(key)
          : null;
      const parsed = existing ? (JSON.parse(existing) as unknown[]) : [];
      const record = {
        id: `${Date.now()}`,
        title: dateIdea,
        matchName,
        matchContact,
        matchContactPlatform,
        matchPhotoUrl,
      };
      if (typeof window !== "undefined" && userId) {
        window.localStorage.setItem(
          key,
          JSON.stringify([record, ...parsed].slice(0, 8)),
        );
      }
      setIsAccepting(false);
      setIsMatched(true);
    }, 2500);
  }

  return (
    <div className="relative w-full max-w-3xl">
      <div className="absolute inset-x-6 top-16 h-52 rounded-b-[2rem] bg-zinc-950/60 blur-2xl" />

      <motion.div
        animate={{ scale: isOpen ? 0.995 : 1 }}
        className={`relative rounded-3xl border border-zinc-700/70 bg-zinc-900 shadow-2xl shadow-black/50 ${
          isOpen ? "overflow-visible" : "overflow-hidden"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.12),transparent_55%)]" />

        {!isOpen ? (
          <div className="relative min-h-[360px] px-6 py-14">
            <motion.div
              className="absolute inset-x-10 bottom-12 h-36 rounded-b-3xl border border-zinc-700 bg-zinc-800/70"
              initial={false}
            />

            <motion.div
              initial={false}
              animate={{ rotateX: isOpen ? 180 : 0, y: isOpen ? -26 : 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                transformOrigin: "top center",
                clipPath: "polygon(0 0, 100% 0, 50% 82%)",
              }}
              className="absolute inset-x-10 top-12 h-44 border border-zinc-700 bg-zinc-800/95"
            />

            <motion.div
              initial={false}
              style={{ clipPath: "polygon(0 100%, 50% 52%, 100% 100%)" }}
              className="absolute inset-x-10 bottom-12 h-28 border border-zinc-700 bg-zinc-800/95"
            />

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsOpen(true)}
              className="absolute left-1/2 top-1/2 z-20 inline-flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-red-950 via-red-900 to-red-950 text-center text-xs font-semibold uppercase tracking-wide text-red-50 shadow-[0_0_0_6px_rgba(127,29,29,0.45)] ring-1 ring-red-800/60"
            >
              Open Today&apos;s Match
            </motion.button>
          </div>
        ) : null}

        <AnimatePresence>
          {isOpen ? (
            <motion.section
              initial={{ y: 220, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 220, opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 m-3 rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-4 text-zinc-900 shadow-xl sm:m-4 sm:px-5 sm:py-5"
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                Proposal
              </p>
              <h2 className="mt-1.5 text-balance text-lg font-semibold leading-snug tracking-tight text-zinc-950 sm:text-xl">
                {dateIdea}
              </h2>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-base font-semibold tracking-tight text-zinc-950 sm:text-lg">
                  {matchName}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={matchPhotoUrl}
                  alt={`${matchName}`}
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-zinc-200/80 shadow-sm sm:h-16 sm:w-16"
                />
              </div>
              <p className="mt-3 text-[13px] leading-snug text-zinc-700 sm:text-sm sm:leading-relaxed">
                {matchReasoning}
              </p>

              <div className="mt-4 border-t border-zinc-200 pt-4">
                {isMatched ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-900 sm:text-sm">
                    Matched! {matchName} accepted your invite. Your contact (
                    <span className="font-semibold">{userContactSummary}</span>)
                    has been shared. Here is theirs:{" "}
                    <span className="font-semibold">
                      {formatContactLine(matchContactPlatform, matchContact)}
                    </span>
                    .
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <button
                      type="button"
                      onClick={onAccept}
                      disabled={isAccepting}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-70"
                    >
                      {isAccepting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Awaiting response...
                        </>
                      ) : (
                        "Accept Invitation"
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isAccepting}
                      onClick={() => onPass?.()}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-70"
                    >
                      Pass
                    </button>
                  </div>
                )}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
