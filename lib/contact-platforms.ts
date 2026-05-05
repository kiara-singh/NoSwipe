/** Shared labels for where matches can reach the user (onboarding + profile). */
export const CONTACT_PLATFORMS = [
  "Instagram",
  "Threads",
  "Snapchat",
  "Telegram",
  "Signal",
  "iMessage",
  "WhatsApp",
  "Phone",
  "Other",
] as const;

export type ContactPlatform = (typeof CONTACT_PLATFORMS)[number];

export function formatContactLine(platform: string, handle: string) {
  const p = platform.trim();
  const h = handle.trim();
  if (!p && !h) return "";
  if (!p) return h;
  if (!h) return p;
  return `${p} · ${h}`;
}
