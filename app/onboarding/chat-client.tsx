"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

export type ChatMessage = { role: "user" | "model"; content: string };

const INITIAL_MODEL_MESSAGE =
  "Welcome to NoSwipe. Let's skip the bios. What does an ideal Sunday look like for you?";

export function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "model", content: INITIAL_MODEL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const messagesWithUser = [...messages, userMessage];
    setMessages(messagesWithUser);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesWithUser }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
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
      setError("Could not reach the agent. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[min(720px,calc(100dvh-7rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xl shadow-zinc-200/40">
      <header className="shrink-0 border-b border-zinc-100 bg-zinc-50/80 px-4 py-3 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Match agent
        </p>
        <p className="text-sm font-semibold text-zinc-900">NoSwipe onboarding</p>
      </header>

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

        {loading ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-2.5 text-sm text-zinc-600">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-600" aria-hidden />
              Agent is typing…
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
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
            disabled={loading}
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/20 transition placeholder:text-zinc-400 focus:border-violet-300 focus:ring-4 disabled:opacity-60"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
