import Link from "next/link";
import Groq from "groq-sdk";
import { ArrowRight } from "lucide-react";
import {
  HomeInviteSection,
  type HomeInviteMatch,
} from "@/components/home-invite-section";
import { formatContactLine } from "@/lib/contact-platforms";
import { createClient } from "@/utils/supabase/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/** Groq: llama3-70b-8192 retired; use llama-3.3-70b-versatile for JSON + quality */
const INVITE_JSON_MODEL = "llama-3.3-70b-versatile";

const FALLBACK_MATCH: { date_idea: string; match_reasoning: string } = {
  date_idea: "Sunday Coffee & Book Swap at Blue Bottle",
  match_reasoning:
    "You and your match both value thoughtful, low-pressure connection and discover people best through shared rituals. A coffee + book swap gives you an easy starting point with enough depth for real chemistry to surface quickly.",
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
        const systemInstruction = `You are an elite matchmaker for NoSwipe. Return ONLY JSON with keys: date_idea and match_reasoning.
Writing rules: The invite is shown only to the member whose intent is labeled "yours". Always address them as "you". Refer to the suggested match by first name only (${mock.name}). Never write "User A/User B", never use both people's full names in third person (e.g. avoid "Alex and Jordan both…"). Use "you and ${mock.name}…" or "you both…" where "both" means you and ${mock.name}. Keep match_reasoning in that voice.
date_idea must be a short label only: maximum 12 words, target ~6–10 words—like a calendar event title (activity + place or vibe). No explaining why, no "allowing you to…", no comma-run-on sentences; put all rationale in match_reasoning.`;
        const userPrompt = `Create one specific, low-friction date idea based on overlap between these two people.

Your intent (you are the member opening this invite):
${JSON.stringify(
          userIntent ?? {
            vibe: "intent not available",
            intent: "intent not available",
          },
        )}

${mock.name}'s intent (your suggested match):
${JSON.stringify(mock.intent)}

Return strict JSON: {"date_idea": string, "match_reasoning": string}
date_idea: phone-lock-screen short (≤12 words). match_reasoning: 2–4 sentences max, same "you" voice.`;

        const completion = await groq.chat.completions.create({
          model: INVITE_JSON_MODEL,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content ?? "";
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
        <main className="relative z-10 mx-auto flex max-w-5xl flex-1 flex-col items-center px-4 py-6 md:px-8 md:py-10">
          <HomeInviteSection
            userId={user.id}
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
