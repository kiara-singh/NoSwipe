"use client";

import { useEffect, useState } from "react";
import { formatContactLine } from "@/lib/contact-platforms";

type UpcomingDate = {
  id: string;
  title: string;
  matchName: string;
  matchContact: string;
  matchContactPlatform?: string;
  matchPhotoUrl: string;
};

export function UpcomingDatesClient() {
  const [items, setItems] = useState<UpcomingDate[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem("noswipe_upcoming_dates");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as UpcomingDate[];
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch {
      // Ignore malformed demo data.
    }
  }, []);

  if (items.length === 0) {
    return (
      <p className="mt-2 text-sm text-slate-600/90">
        No confirmed dates yet. Accepted invitations will appear here.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-[#02060c] px-3 py-2.5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.matchPhotoUrl}
            alt={`${item.matchName} avatar`}
            className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-800"
          />
          <div>
            <p className="text-sm font-medium text-slate-200">{item.title}</p>
            <p className="text-xs text-slate-600">
              with {item.matchName} ·{" "}
              {item.matchContactPlatform
                ? formatContactLine(item.matchContactPlatform, item.matchContact)
                : item.matchContact}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
