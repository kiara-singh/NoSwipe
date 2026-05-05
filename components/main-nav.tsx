"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/profile", label: "Profile" },
] as const;

export function MainNav() {
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session?.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const hideMainLinks =
    pathname.startsWith("/onboarding") ||
    (pathname === "/" && isAuthed !== true);

  const isPublicLanding = pathname === "/" && isAuthed !== true;

  return (
    <header
      className={
        isPublicLanding
          ? "sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md"
          : "sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md"
      }
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className={`inline-flex items-center gap-2 text-sm font-semibold tracking-tight ${
            isPublicLanding ? "text-zinc-100" : "text-zinc-900"
          }`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg shadow-sm ${
              isPublicLanding
                ? "bg-white text-zinc-900"
                : "bg-zinc-900 text-white"
            }`}
          >
            <Heart className="h-3.5 w-3.5" aria-hidden />
          </span>
          NoSwipe
        </Link>

        {hideMainLinks ? null : (
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
