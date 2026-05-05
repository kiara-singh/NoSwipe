"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CONTACT_PLATFORMS } from "@/lib/contact-platforms";

type ProfileEditFormProps = {
  initialFullName: string;
  /** Saved as `profiles.contact_method` (platform). */
  initialContactPlatform: string;
  /** Saved as `profiles.contact_name` (handle / number). */
  initialContactName: string;
};

export function ProfileEditForm({
  initialFullName,
  initialContactPlatform,
  initialContactName,
}: ProfileEditFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [contactPlatform, setContactPlatform] = useState(initialContactPlatform);
  const [contactName, setContactName] = useState(initialContactName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(initialFullName);
    setContactPlatform(initialContactPlatform);
    setContactName(initialContactName);
  }, [initialFullName, initialContactPlatform, initialContactName]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          contact_method: contactPlatform.trim(),
          contact_name: contactName.trim(),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not save changes.");
        return;
      }
      setMessage("Saved.");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSave(e)}
      className="mt-6 space-y-4 border-t border-white/[0.06] pt-6"
    >
      <h2 className="text-sm font-semibold tracking-tight text-slate-300">
        Edit details
      </h2>
      <div>
        <label htmlFor="full_name" className="text-xs font-medium text-slate-500">
          Full name
        </label>
        <input
          id="full_name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-900 bg-[#020508] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-950/55 focus:ring-4 focus:ring-blue-950/15"
          autoComplete="name"
        />
      </div>
      <div>
        <span className="text-xs font-medium text-slate-500">Contact platform</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CONTACT_PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setContactPlatform(p)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                contactPlatform === p
                  ? "border-blue-950 bg-blue-950 text-slate-100 shadow-sm shadow-black/50 ring-1 ring-blue-900/40"
                  : "border-slate-900 bg-[#050c14] text-slate-500 hover:border-slate-800"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="contact_name" className="text-xs font-medium text-slate-500">
          Handle or number
        </label>
        <input
          id="contact_name"
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="@you or phone"
          className="mt-1 w-full rounded-xl border border-slate-900 bg-[#020508] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-950/55 focus:ring-4 focus:ring-blue-950/15"
          autoComplete="off"
        />
      </div>
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-xs text-emerald-400/80">{message}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-950/60 bg-blue-950 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-lg shadow-black/40 transition hover:bg-blue-900 hover:border-blue-900 disabled:opacity-60"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          "Save changes"
        )}
      </button>
    </form>
  );
}
