import Link from "next/link";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ArrowRight } from "lucide-react";
import {
  HomeInviteSection,
  type HomeInviteMatch,
} from "@/components/home-invite-section";
import { formatContactLine } from "@/lib/contact-platforms";
import { createClient } from "@/utils/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const FALLBACK_MATCH: { date_idea: string; match_reasoning: string } = {
  date_idea: "Sunday Coffee & Book Swap at Blue Bottle",
  match_reasoning:
    "You both value thoughtful, low-pressure connection and discover people best through shared rituals. A coffee + book swap creates an easy starting point with enough depth for real chemistry to surface quickly.",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, intent_data, contact_method, contact_name")
      .eq("id", user.id)
      .maybeSingle();

    const mockMatchA = {
      name: "Alex",
      contact: "@alex_explores",
      contactPlatform: "Instagram",
      photoUrl: "https://i.pravatar.cc/240?img=32",
      intent: {
        vibe: "curious grounded playful",
        intent:
          "Looking for a warm, consistent connection built through shared routines and honest conversation.",
      },
    };

    const mockMatchB = {
      name: "Jordan",
      contact: "jordan.reads",
      contactPlatform: "Threads",
      photoUrl: "https://i.pravatar.cc/240?img=58",
      intent: {
        vibe: "bookish warm deliberate",
        intent:
          "Wants slow-burn chemistry and someone who shows up consistently without playing games.",
      },
    };

    const userIntent =
      profile?.intent_data &&
      typeof profile.intent_data === "object" &&
      !Array.isArray(profile.intent_data)
        ? profile.intent_data
        : null;

    async function generateInviteForMock(mock: {
      name: string;
      contact: string;
      contactPlatform: string;
      photoUrl: string;
      intent: { vibe: string; intent: string };
    }): Promise<HomeInviteMatch> {
      let matchData = FALLBACK_MATCH;
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {
            responseMimeType: "application/json",
          },
          systemInstruction:
            "You are an elite matchmaker for NoSwipe. Return ONLY JSON with keys: date_idea and match_reasoning.",
        });

        const result = await model.generateContent(
          `Create one specific, low-friction date idea based on overlap.\n\nUser A intent:\n${JSON.stringify(
            userIntent ?? {
              vibe: "intent not available",
              intent: "intent not available",
            },
          )}\n\nUser B intent:\n${JSON.stringify(
            mock.intent,
          )}\n\nReturn strict JSON: {"date_idea": string, "match_reasoning": string}`,
        );

        const raw = result.response.text();
        const parsed = JSON.parse(raw) as {
          date_idea?: unknown;
          match_reasoning?: unknown;
        };

        if (
          typeof parsed.date_idea === "string" &&
          typeof parsed.match_reasoning === "string"
        ) {
          matchData = {
            date_idea: parsed.date_idea,
            match_reasoning: parsed.match_reasoning,
          };
        }
      } catch (error) {
        console.error("Home matchmaker error:", error);
        matchData = FALLBACK_MATCH;
      }

      return {
        dateIdea: matchData.date_idea,
        matchReasoning: matchData.match_reasoning,
        matchName: mock.name,
        matchContact: mock.contact,
        matchContactPlatform: mock.contactPlatform,
        matchPhotoUrl: mock.photoUrl,
      };
    }

    const [inviteA, inviteB] = await Promise.all([
      generateInviteForMock(mockMatchA),
      generateInviteForMock(mockMatchB),
    ]);

    const userContactSummary =
      formatContactLine(
        typeof profile?.contact_method === "string" ? profile.contact_method : "",
        typeof profile?.contact_name === "string" ? profile.contact_name : "",
      ) || "Not set yet";

    return (
      <div className="min-h-full flex-1 bg-zinc-950 text-zinc-100">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(250,250,249,0.06),transparent)]" />
        <main className="relative z-10 mx-auto flex max-w-5xl flex-1 flex-col items-center px-4 py-12 md:px-8 md:py-20">
          <HomeInviteSection
            matches={[inviteA, inviteB]}
            userContactSummary={userContactSummary}
            welcomeName={profile?.full_name ?? null}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_70%_-30%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(ellipse_60%_50%_at_10%_50%,rgba(34,211,238,0.06),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:64px_64px]"
      />
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pb-24 pt-16 md:px-10 md:pt-20">
        <div className="text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl md:text-6xl md:leading-[1.02]">
            Meet someone
            <br />
            worth{" "}
            <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              showing up for
            </span>
            .
          </h1>
          <div className="mt-12 flex justify-center">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-10 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-zinc-800/80 bg-zinc-950 py-8 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} NoSwipe
      </footer>
    </div>
  );
}
