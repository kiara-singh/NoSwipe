import Link from "next/link";
import { ArrowRight, Heart, Sparkles, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-[#fafafa] text-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.12),transparent)]"
      />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 md:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm">
            <Heart className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          NoSwipe
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:bg-zinc-800 active:scale-[0.98]"
          >
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-24 pt-12 md:px-10 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
            Intentional dating, refined
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl md:text-6xl md:leading-[1.05]">
            Connection without the{" "}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              endless scroll
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-zinc-600 md:text-xl">
            NoSwipe is built for people who want quality over quantity—curated
            matches, calm UX, and respect for your time.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-8 text-sm font-semibold text-white shadow-md transition hover:bg-zinc-800 sm:w-auto"
            >
              Join NoSwipe
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-8 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto"
            >
              I have an account
            </Link>
          </div>
        </div>

        <ul className="mx-auto mt-24 grid max-w-4xl gap-4 sm:grid-cols-3 sm:gap-6">
          {[
            {
              icon: Users,
              title: "People, not portfolios",
              body: "Profiles designed for signal—so you see the person, not just the photos.",
            },
            {
              icon: Heart,
              title: "Fewer swipes, more meaning",
              body: "A flow that nudges you toward real conversation instead of infinite browsing.",
            },
            {
              icon: Sparkles,
              title: "Premium calm",
              body: "Whitespace, typography, and motion that feel like a product you trust.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-2xl border border-zinc-100 bg-white p-6 text-left shadow-sm"
            >
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-900">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h2 className="text-base font-semibold tracking-tight text-zinc-950">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="relative z-10 border-t border-zinc-100 bg-white/60 py-8 text-center text-xs text-zinc-500 backdrop-blur-sm">
        © {new Date().getFullYear()} NoSwipe. Crafted with care.
      </footer>
    </div>
  );
}
