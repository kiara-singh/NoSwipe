"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { formatContactLine } from "@/lib/contact-platforms";
import { upcomingDatesStorageKey } from "@/lib/noswipe-demo-storage";

type InviteLetterProps = {
  userId: string;
  senderHandle: string;
  wingedByHandle?: string;
  matchedUserId: string;
  dateIdea: string;
  matchReasoning: string;
  matchName: string;
  matchContact: string;
  matchContactPlatform: string;
  matchPhotoUrl: string;
  isWingedMatch?: boolean;
  pitchMessage?: string;
  userContactSummary: string;
  onPass?: () => void;
  onAcceptSuccess?: () => void;
  onShareSuccess?: () => void;
};

type FriendProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  contact_name: string | null;
};

type FriendRequestRow = {
  id: string;
  profile: FriendProfile | null;
};

type RequestsResponse = {
  accepted: FriendRequestRow[];
  error?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function InviteLetter({
  userId,
  senderHandle,
  wingedByHandle,
  matchedUserId,
  dateIdea,
  matchReasoning,
  matchName,
  matchContact,
  matchContactPlatform,
  matchPhotoUrl,
  isWingedMatch = false,
  pitchMessage,
  userContactSummary,
  onPass,
  onAcceptSuccess,
  onShareSuccess,
}: InviteLetterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [receiverHandle, setReceiverHandle] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState(false);
  const [acceptedFriends, setAcceptedFriends] = useState<FriendProfile[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const canShareThisMatch = UUID_RE.test(matchedUserId);

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
      onAcceptSuccess?.();
    }, 2500);
  }

  async function onSendMatch() {
    if (!receiverHandle.trim() || !matchedUserId.trim()) return;
    const runId = "share-match-pre-fix-1";
    // #region agent log
    fetch("http://127.0.0.1:7854/ingest/140fb55f-ac43-45e4-920a-4e5d365e0f48", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "4bcf0c",
      },
      body: JSON.stringify({
        sessionId: "4bcf0c",
        runId,
        hypothesisId: "H1",
        location: "components/invite-letter.tsx:onSendMatch:start",
        message: "Share payload before POST",
        data: {
          matchedUserId,
          matchedUserIdLooksUuid:
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              matchedUserId,
            ),
          receiverId: receiverHandle.trim(),
          hasWingedMatch: isWingedMatch,
          matchName,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    setIsSending(true);
    setShareError("");
    try {
      const res = await fetch("/api/share-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: userId,
          senderHandle,
          receiverId: receiverHandle.trim(),
          matchedUserId,
          pitchMessage: shareMessage.trim(),
        }),
      });

      const payload = (await res.json()) as { error?: string; success?: boolean };

      if (res.status === 404) {
        setShareError(payload.error ?? "User not found. They need to join first.");
        return;
      }
      if (!res.ok || !payload.success) {
        setShareError(payload.error ?? "Could not route this match right now.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("hasMatchedToday", "true");
      }
      setIsSharing(false);
      setIsOpen(false);
      setShareSuccess(true);
      onShareSuccess?.();
    } catch {
      setShareError("Could not route this match right now.");
    } finally {
      setIsSending(false);
    }
  }

  async function startShareFlow() {
    if (!canShareThisMatch) {
      setShareError("This suggested match is demo-only and cannot be shared yet.");
      setIsSharing(true);
      return;
    }
    setShareError("");
    setShareSuccess(false);
    setIsLoadingFriends(true);
    try {
      const res = await fetch("/api/friends/requests", { method: "GET" });
      const payload = (await res.json()) as RequestsResponse;
      if (!res.ok) {
        setShareError(payload.error ?? "Could not load your wingmen.");
        setAcceptedFriends([]);
        setIsSharing(true);
        return;
      }
      const friends = (payload.accepted ?? [])
        .map((row) => row.profile)
        .filter((profile): profile is FriendProfile => Boolean(profile));
      setAcceptedFriends(friends);
      if (friends.length > 0) {
        setReceiverHandle((prev) => prev || friends[0].id);
      } else {
        setReceiverHandle("");
      }
    } catch {
      setShareError("Could not load your wingmen.");
      setAcceptedFriends([]);
    }
    setIsLoadingFriends(false);
    setIsSharing(true);
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
              <p
                className={`text-[10px] font-medium uppercase tracking-[0.2em] ${
                  isWingedMatch
                    ? "bg-gradient-to-r from-violet-900 via-fuchsia-900 to-purple-900 bg-clip-text text-transparent [text-shadow:0_1px_0_rgba(255,255,255,0.3)]"
                    : "text-zinc-500"
                }`}
              >
                {isWingedMatch
                  ? `You've been winged by ${wingedByHandle || "a friend"}`
                  : "Your Daily Match"}
              </p>
              <h2 className="mt-1.5 text-balance text-lg font-semibold leading-snug tracking-tight text-zinc-950 sm:text-xl">
                {dateIdea}
              </h2>
              {isWingedMatch && pitchMessage ? (
                <blockquote className="mt-3 rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm italic text-zinc-700">
                  &ldquo;{pitchMessage}&rdquo;
                </blockquote>
              ) : null}
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
                  <div className="space-y-2">
                    {!isSharing ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                        <button
                          type="button"
                          onClick={onAccept}
                          disabled={isAccepting || isSending}
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
                          disabled={isAccepting || isSending}
                          onClick={() => onPass?.()}
                          className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-70"
                        >
                          Pass
                        </button>
                        <button
                          type="button"
                          disabled={isAccepting || isSending}
                          onClick={() => {
                            void startShareFlow();
                          }}
                          title={
                            canShareThisMatch
                              ? undefined
                              : "Demo match cannot be shared yet"
                          }
                          className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-70"
                        >
                          Send to a Friend
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-zinc-200 bg-white p-3">
                        <label className="text-xs font-medium text-zinc-600">
                          Pick a friend
                        </label>
                        {isLoadingFriends ? (
                          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            Loading wingmen...
                          </div>
                        ) : acceptedFriends.length === 0 ? (
                          <p className="mt-1 text-xs text-zinc-600">
                            No accepted wingmen yet. Add friends in your profile first.
                          </p>
                        ) : (
                          <select
                            value={receiverHandle}
                            onChange={(e) => setReceiverHandle(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300/30 transition focus:border-zinc-500 focus:ring-4"
                          >
                            {acceptedFriends.map((friend) => (
                              <option key={friend.id} value={friend.id}>
                                {(friend.full_name?.trim() || "Unnamed user") +
                                  " · " +
                                  (friend.contact_name?.trim() || "No handle")}
                              </option>
                            ))}
                          </select>
                        )}
                        <label className="mt-3 block text-xs font-medium text-zinc-600">
                          Why they should meet
                        </label>
                        <textarea
                          value={shareMessage}
                          onChange={(e) => setShareMessage(e.target.value)}
                          placeholder="You two have the same dry humor and love climbing..."
                          rows={3}
                          className="mt-1 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300/30 transition focus:border-zinc-500 focus:ring-4"
                        />
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={isSending}
                            onClick={() => {
                              setIsSharing(false);
                              setShareError("");
                            }}
                            className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-70"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={
                              isSending ||
                              !receiverHandle.trim() ||
                              acceptedFriends.length === 0
                            }
                            onClick={() => void onSendMatch()}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-70"
                          >
                            {isSending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                Sending...
                              </>
                            ) : (
                              "Send Match"
                            )}
                          </button>
                        </div>
                        {shareError ? (
                          <p className="mt-2 text-xs text-red-600">{shareError}</p>
                        ) : null}
                      </div>
                    )}
                    {shareSuccess ? (
                      <p className="text-sm font-medium text-emerald-700">
                        Match routed to your friend!
                      </p>
                    ) : null}
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
