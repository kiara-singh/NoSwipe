"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, UserRound } from "lucide-react";

type FriendsClientProps = {
  userId: string;
};

type FriendProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  contact_name: string | null;
};

type FriendRequestRow = {
  id: string | null;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  profile: FriendProfile | null;
};

type RequestsResponse = {
  incoming: FriendRequestRow[];
  outgoing: FriendRequestRow[];
  accepted: FriendRequestRow[];
  error?: string;
};

function normalizeContactMethod(raw: string) {
  return raw.trim();
}

export function FriendsClient({ userId }: FriendsClientProps) {
  const [incoming, setIncoming] = useState<FriendRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestRow[]>([]);
  const [accepted, setAccepted] = useState<FriendRequestRow[]>([]);
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<FriendProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }
    void refreshRequests(false);
  }, [userId]);

  async function refreshRequests(showLoading = true) {
    if (showLoading) setIsRefreshing(true);
    try {
      const res = await fetch("/api/friends/requests", { method: "GET" });
      const payload = (await res.json()) as RequestsResponse;
      if (!res.ok) {
        setError(payload.error ?? "Could not load friend requests.");
        return;
      }

      setIncoming(payload.incoming ?? []);
      setOutgoing(payload.outgoing ?? []);
      setAccepted(payload.accepted ?? []);
    } catch {
      setError("Could not load friend requests.");
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  }

  async function onPreviewFriend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPreview(null);
    const contactMethod = normalizeContactMethod(input);
    if (!contactMethod) return;

    setIsPreviewing(true);
    try {
      const res = await fetch("/api/friends/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_method: contactMethod }),
      });
      const payload = (await res.json()) as FriendProfile & { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not find this user.");
        return;
      }
      setPreview(payload);
    } catch {
      setError("Could not look up that handle.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function onSendRequest() {
    if (!preview) return;
    setError(null);
    setIsSending(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: preview.id }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !payload.success) {
        setError(payload.error ?? "Could not send request.");
        return;
      }
      setInput("");
      setPreview(null);
      await refreshRequests(false);
    } catch {
      setError("Could not send request.");
    } finally {
      setIsSending(false);
    }
  }

  async function onUpdateRequest(requestId: string, status: "accepted" | "declined") {
    setError(null);
    setActioningId(requestId);
    try {
      const res = await fetch(`/api/friends/request/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !payload.success) {
        setError(payload.error ?? "Could not update request.");
        return;
      }
      await refreshRequests(false);
    } catch {
      setError("Could not update request.");
    } finally {
      setActioningId(null);
    }
  }

  const acceptedProfiles = useMemo(
    () => accepted.map((row) => row.profile).filter((p): p is FriendProfile => Boolean(p)),
    [accepted],
  );

  function requestRowKey(row: FriendRequestRow) {
    return `${row.id ?? "no-id"}:${row.sender_id}:${row.receiver_id}:${row.created_at}`;
  }

  function FriendAvatar({ profile }: { profile: FriendProfile }) {
    if (profile.avatar_url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={profile.full_name?.trim() || "Friend avatar"}
          className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-800"
        />
      );
    }
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#050c14] text-slate-500 ring-1 ring-slate-900">
        <UserRound className="h-5 w-5" aria-hidden />
      </span>
    );
  }

  function FriendRow({
    row,
    actions,
    badge,
  }: {
    row: FriendRequestRow;
    actions?: ReactNode;
    badge?: string;
  }) {
    const profile = row.profile;
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-900 bg-[#050c14] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {profile ? (
            <FriendAvatar profile={profile} />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#050c14] text-slate-500 ring-1 ring-slate-900">
              <UserRound className="h-5 w-5" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-200">
              {profile?.full_name?.trim() || "User"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {profile?.contact_name?.trim() || "Profile unavailable"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge ? (
            <span className="rounded-full border border-slate-800 bg-[#020508] px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
              {badge}
            </span>
          ) : null}
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.04] bg-[#010407]/95 p-5">
      <p className="text-sm font-semibold tracking-tight text-slate-300">
        Wingman circle
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Send requests, manage pending invites, and build your accepted wingmen list.
      </p>
      <form onSubmit={(e) => void onPreviewFriend(e)} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="@alex_dev"
          className="min-w-0 flex-1 rounded-xl border border-slate-900 bg-[#020508] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-950/55 focus:ring-4 focus:ring-blue-950/15"
        />
        <button
          type="submit"
          disabled={isPreviewing || isSending}
          className="inline-flex items-center justify-center rounded-xl border border-blue-950/60 bg-blue-950 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-blue-900 hover:bg-blue-900"
        >
          {isPreviewing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            "Find"
          )}
        </button>
      </form>

      {preview ? (
        <div className="mt-3 rounded-xl border border-slate-800 bg-[#040a12] p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Request preview
          </p>
          <div className="mt-2 flex items-center gap-3">
            <FriendAvatar profile={preview} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">
                {preview.full_name?.trim() || "Unnamed user"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {preview.contact_name?.trim() || "No handle"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onSendRequest()}
              disabled={isSending}
              className="ml-auto inline-flex items-center justify-center rounded-lg border border-emerald-900/60 bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-800 hover:bg-emerald-900/50 disabled:opacity-70"
            >
              {isSending ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      {isRefreshing ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading requests...
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Incoming Requests
          </h3>
          {incoming.length === 0 ? (
            <p className="mt-2 text-xs text-slate-600">No incoming requests.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {incoming.map((row) => (
                <FriendRow
                  key={requestRowKey(row)}
                  row={row}
                  actions={
                    <>
                      <button
                        type="button"
                        disabled={actioningId === row.id || !row.id}
                        onClick={() => {
                          if (!row.id) return;
                          void onUpdateRequest(row.id, "accepted");
                        }}
                        className="rounded-lg border border-emerald-900/60 bg-emerald-950/50 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 transition hover:border-emerald-800"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={actioningId === row.id || !row.id}
                        onClick={() => {
                          if (!row.id) return;
                          void onUpdateRequest(row.id, "declined");
                        }}
                        className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-2.5 py-1 text-[11px] font-semibold text-rose-200 transition hover:border-rose-800"
                      >
                        Decline
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Outgoing Requests
          </h3>
          {outgoing.length === 0 ? (
            <p className="mt-2 text-xs text-slate-600">No pending requests sent.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {outgoing.map((row) => (
                <FriendRow key={requestRowKey(row)} row={row} badge="Pending" />
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Your Wingmen
          </h3>
          {acceptedProfiles.length === 0 ? (
            <p className="mt-2 text-xs text-slate-600">No accepted wingmen yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {accepted.map((row) => (
                <FriendRow key={requestRowKey(row)} row={row} badge="Accepted" />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
