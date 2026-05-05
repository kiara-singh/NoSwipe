"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { CONTACT_PLATFORMS, type ContactPlatform } from "@/lib/contact-platforms";

export type ChatMessage = { role: "user" | "model"; content: string };

const TOTAL_STEPS = 6;
const INTERVIEW_STEPS = 5;

const INITIAL_MODEL_MESSAGE =
  "Welcome to NoSwipe. Before we start, what should I call you?";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function ChatClient() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "model", content: INITIAL_MODEL_MESSAGE },
  ]);
  const [fullName, setFullName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPlatform, setContactPlatform] = useState<ContactPlatform | "">(
    "",
  );
  const [userMessagesSent, setUserMessagesSent] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, finalizeLoading, previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearSelectedFile() {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    const priorSnapshot = messages;
    const priorUserSendCount = userMessagesSent;
    const nextUserNumber = priorUserSendCount + 1;
    const onContactStep = nextUserNumber === 2;

    const canSendFinal =
      nextUserNumber === 6 && (trimmed.length > 0 || selectedFile !== null);
    const canSendChat =
      nextUserNumber < 6 &&
      (onContactStep
        ? contactPlatform.length > 0 && trimmed.length > 0
        : trimmed.length > 0);

    if (!canSendFinal && !canSendChat) return;
    if (loading || finalizeLoading) return;

    let userText =
      trimmed ||
      (nextUserNumber === 6 && selectedFile
        ? "Uploaded a profile photo."
        : "");
    if (onContactStep) {
      userText = `Platform: ${contactPlatform}; Handle: ${trimmed}`;
    }
    if (!userText && nextUserNumber !== 6) return;

    const userMessage: ChatMessage = { role: "user", content: userText };
    const messagesWithUser = [...priorSnapshot, userMessage];

    setError(null);
    setMessages(messagesWithUser);
    setInput("");
    setUserMessagesSent(nextUserNumber);
    if (nextUserNumber === 1 && trimmed) {
      setFullName(trimmed);
    }
    if (nextUserNumber === 2 && trimmed) {
      setContactName(trimmed);
    }

    if (nextUserNumber === 6) {
      setFinalizeLoading(true);
      try {
        let imageUrl: string | undefined;

        if (selectedFile) {
          const supabase = createClient();
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          if (userError || !user) {
            setMessages(priorSnapshot);
            setUserMessagesSent(priorUserSendCount);
            setInput(trimmed);
            setError("You must be signed in to upload.");
            return;
          }

          const path = `${user.id}/${Date.now()}-${sanitizeFileName(selectedFile.name)}`;
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(path, selectedFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            setMessages(priorSnapshot);
            setUserMessagesSent(priorUserSendCount);
            setInput(trimmed);
            setError(uploadError.message);
            return;
          }

          const { data: pub } = supabase.storage
            .from("avatars")
            .getPublicUrl(path);
          imageUrl = pub.publicUrl;
        }

        const res = await fetch("/api/finalize-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesWithUser,
            ...(imageUrl ? { imageUrl } : {}),
            ...(fullName ? { full_name: fullName } : {}),
            ...(contactPlatform ? { contact_method: contactPlatform } : {}),
            ...(contactName ? { contact_name: contactName } : {}),
          }),
        });

        const data = (await res.json()) as { success?: boolean; error?: string };

        if (!res.ok || !data.success) {
          setMessages(priorSnapshot);
          setUserMessagesSent(priorUserSendCount);
          setInput(trimmed);
          setError(data.error ?? "Could not finalize your profile.");
          return;
        }

        router.replace("/");
        router.refresh();
      } catch {
        setMessages(priorSnapshot);
        setUserMessagesSent(priorUserSendCount);
        setInput(trimmed);
        setError("Could not reach the server. Try again.");
      } finally {
        setFinalizeLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesWithUser,
          onboardingTurn: nextUserNumber,
        }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setMessages(priorSnapshot);
        setUserMessagesSent(priorUserSendCount);
        setInput(trimmed);
        setError(data.error ?? "Something went wrong.");
        return;
      }

      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { role: "model", content: data.message as string },
        ]);
      }
    } catch {
      setMessages(priorSnapshot);
      setUserMessagesSent(priorUserSendCount);
      setInput(trimmed);
      setError("Could not reach the agent. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || finalizeLoading;
  const loadingLabel = finalizeLoading
    ? "Extracting Intent Vector..."
    : "Agent is typing…";

  /** Steps 1–5: name, handle, three vibe rounds. Step 6: profile photo. */
  const atPhotoStep = userMessagesSent >= INTERVIEW_STEPS;
  const onContactStepUi = userMessagesSent === 1;
  const submitDisabled =
    busy ||
    (atPhotoStep
      ? !input.trim() && !selectedFile
      : onContactStepUi
        ? !contactPlatform || !input.trim()
        : !input.trim());

  const progressLabel =
    userMessagesSent >= TOTAL_STEPS
      ? "Onboarding complete"
      : atPhotoStep
        ? `Step ${TOTAL_STEPS} of ${TOTAL_STEPS} · Profile photo`
        : userMessagesSent === 1
          ? `Step 2 of ${TOTAL_STEPS} · Platform & handle`
          : userMessagesSent >= 2 && userMessagesSent <= 4
            ? `Step ${userMessagesSent + 1} of ${TOTAL_STEPS} · Vibe & intent`
            : `Step 1 of ${TOTAL_STEPS} · Your name`;

  return (
    <div className="flex h-[min(720px,calc(100dvh-7rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xl shadow-zinc-200/40">
      <header className="shrink-0 border-b border-zinc-100 bg-zinc-50/80 px-4 py-3 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Match agent
        </p>
        <p className="text-sm font-semibold text-zinc-900">NoSwipe onboarding</p>
        <p className="mt-1 text-xs text-zinc-500">{progressLabel}</p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          Six steps: name, platform + handle, three vibe questions, then your
          photo.
        </p>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={onFileChange}
      />

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((msg, i) => (
          <div
            key={`${msg.role}-${i}-${msg.content.slice(0, 24)}`}
            className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                msg.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm"
                  : "max-w-[85%] rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-2.5 text-sm leading-relaxed text-zinc-900"
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {busy ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-2.5 text-sm text-zinc-600">
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-violet-600"
                aria-hidden
              />
              {loadingLabel}
            </div>
          </div>
        ) : null}

        {error ? (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="shrink-0 border-t border-zinc-100 bg-zinc-50/50 p-3"
      >
        {previewUrl ? (
          <div className="relative mb-3 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="h-16 w-16 rounded-lg border border-zinc-200 object-cover"
            />
            <button
              type="button"
              onClick={clearSelectedFile}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : null}

        {onContactStepUi ? (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {CONTACT_PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={busy || userMessagesSent >= TOTAL_STEPS}
                onClick={() => setContactPlatform(p)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  contactPlatform === p
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                } disabled:opacity-50`}
              >
                {p}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              atPhotoStep
                ? "Optional note — attach a photo, then finish…"
                : onContactStepUi
                  ? "Handle, @username, or number…"
                  : "Type your answer…"
            }
            disabled={busy || userMessagesSent >= TOTAL_STEPS}
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/20 transition placeholder:text-zinc-400 focus:border-violet-300 focus:ring-4 disabled:opacity-60"
            autoComplete="off"
          />
          <button
            type="button"
            disabled={busy || userMessagesSent >= TOTAL_STEPS || !atPhotoStep}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50"
            aria-label="Attach profile photo"
            title={
              atPhotoStep
                ? "Add photo"
                : "Photo upload unlocks after the vibe questions"
            }
          >
            <Paperclip className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="submit"
            disabled={submitDisabled || userMessagesSent >= TOTAL_STEPS}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">
              {atPhotoStep ? "Finish" : "Send"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
