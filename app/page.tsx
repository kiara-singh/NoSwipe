import { redirect } from "next/navigation";
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

const ALEX_PROFILE_ID = "c7e02bb2-74fc-43e8-b867-2c71c11c9806";
const JORDAN_PROFILE_ID = "34ba8626-fccc-4641-8ba5-8d13aee5ba6d";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, intent_data, contact_method, contact_name, onboarding_completed",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.onboarding_completed) {
      redirect("/onboarding");
    }

    const { data: seededProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, contact_method, contact_name, intent_data")
      .in("id", [ALEX_PROFILE_ID, JORDAN_PROFILE_ID]);

    const seededById = new Map(
      (seededProfiles ?? []).map((seededProfile) => [seededProfile.id, seededProfile]),
    );

    const userIntent =
      profile?.intent_data &&
      typeof profile.intent_data === "object" &&
      !Array.isArray(profile.intent_data)
        ? profile.intent_data
        : null;

    async function generateInviteForProfile(candidate: {
      id: string;
      name: string;
      contact: string;
      contactPlatform: string;
      photoUrl: string;
      intent: { vibe: string; intent: string };
    }): Promise<HomeInviteMatch> {
      let matchData = FALLBACK_MATCH;
      try {
        const systemInstruction = `You are an elite matchmaker for NoSwipe. Return ONLY JSON with keys: date_idea and match_reasoning.
Writing rules: The invite is shown only to the member whose intent is labeled "yours". Always address them as "you". Refer to the suggested match by first name only (${candidate.name}). Never write "User A/User B", never use both people's full names in third person (e.g. avoid "Alex and Jordan both…"). Use "you and ${candidate.name}…" or "you both…" where "both" means you and ${candidate.name}. Keep match_reasoning in that voice.
date_idea must be a short label only: maximum 12 words, target ~6–10 words—like a calendar event title (activity + place or vibe). No explaining why, no "allowing you to…", no comma-run-on sentences; put all rationale in match_reasoning.`;
        const userPrompt = `Create one specific, low-friction date idea based on overlap between these two people.

Your intent (you are the member opening this invite):
${JSON.stringify(
          userIntent ?? {
            vibe: "intent not available",
            intent: "intent not available",
          },
        )}

${candidate.name}'s intent (your suggested match):
${JSON.stringify(candidate.intent)}

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
        matchedUserId: candidate.id,
        dateIdea: matchData.date_idea,
        matchReasoning: matchData.match_reasoning,
        matchName: candidate.name,
        matchContact: candidate.contact,
        matchContactPlatform: candidate.contactPlatform,
        matchPhotoUrl: candidate.photoUrl,
      };
    }

    function toCandidate(profileId: string, fallbackName: string): {
      id: string;
      name: string;
      contact: string;
      contactPlatform: string;
      photoUrl: string;
      intent: { vibe: string; intent: string };
    } {
      const seeded = seededById.get(profileId);
      const seededIntent =
        seeded?.intent_data &&
        typeof seeded.intent_data === "object" &&
        !Array.isArray(seeded.intent_data)
          ? (seeded.intent_data as { vibe?: unknown; intent?: unknown })
          : null;
      return {
        id: profileId,
        name:
          typeof seeded?.full_name === "string" && seeded.full_name.trim().length > 0
            ? seeded.full_name
            : fallbackName,
        contact:
          typeof seeded?.contact_name === "string" && seeded.contact_name.trim().length > 0
            ? seeded.contact_name
            : "contact not set",
        contactPlatform:
          typeof seeded?.contact_method === "string" &&
          seeded.contact_method.trim().length > 0
            ? seeded.contact_method
            : "Contact",
        photoUrl:
          typeof seeded?.avatar_url === "string" && seeded.avatar_url.trim().length > 0
            ? seeded.avatar_url
            : "https://i.pravatar.cc/240?img=22",
        intent: {
          vibe:
            typeof seededIntent?.vibe === "string"
              ? seededIntent.vibe
              : "curious grounded playful",
          intent:
            typeof seededIntent?.intent === "string"
              ? seededIntent.intent
              : "Looking for a warm, consistent connection built through shared routines and honest conversation.",
        },
      };
    }

    const [inviteA, inviteB] = await Promise.all([
      generateInviteForProfile(toCandidate(ALEX_PROFILE_ID, "Alex")),
      generateInviteForProfile(toCandidate(JORDAN_PROFILE_ID, "Jordan")),
    ]);

    const { data: sharedMatch } = await supabase
      .from("shared_matches")
      .select("sender_id, sender_handle, matched_user_id, pitch_message, created_at")
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let wingedInvite: HomeInviteMatch | null = null;
    let wingedInviteToken: string | null = null;
    if (sharedMatch?.matched_user_id) {
      const { data: wingedByProfile } = sharedMatch.sender_id
        ? await supabase
            .from("profiles")
            .select("full_name, contact_name")
            .eq("id", sharedMatch.sender_id)
            .maybeSingle()
        : sharedMatch.sender_handle
        ? await supabase
            .from("profiles")
            .select("full_name, contact_name")
            .eq("contact_name", sharedMatch.sender_handle)
            .maybeSingle()
        : { data: null as { full_name?: string | null; contact_name?: string | null } | null };

      const { data: matchedProfile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, contact_method, contact_name, intent_data")
        .eq("id", sharedMatch.matched_user_id)
        .maybeSingle();

      if (matchedProfile) {
        const matchedIntent =
          matchedProfile.intent_data &&
          typeof matchedProfile.intent_data === "object" &&
          !Array.isArray(matchedProfile.intent_data)
            ? matchedProfile.intent_data
            : {
                vibe: "intent not available",
                intent: "intent not available",
              };

        wingedInvite = await generateInviteForProfile({
          id: matchedProfile.id,
          name:
            typeof matchedProfile.full_name === "string" && matchedProfile.full_name
              ? matchedProfile.full_name
              : "Winged match",
          contact:
            typeof matchedProfile.contact_name === "string" &&
            matchedProfile.contact_name
              ? matchedProfile.contact_name
              : "contact not set",
          contactPlatform:
            typeof matchedProfile.contact_method === "string" &&
            matchedProfile.contact_method
              ? matchedProfile.contact_method
              : "Contact",
          photoUrl:
            typeof matchedProfile.avatar_url === "string" &&
            matchedProfile.avatar_url
              ? matchedProfile.avatar_url
              : "https://i.pravatar.cc/240?img=22",
          intent: matchedIntent as { vibe: string; intent: string },
        });
        wingedInvite = {
          ...wingedInvite,
          isWingedMatch: true,
          pitchMessage:
            typeof sharedMatch.pitch_message === "string"
              ? sharedMatch.pitch_message
              : "",
          senderHandle:
            typeof wingedByProfile?.full_name === "string" &&
            wingedByProfile.full_name.trim().length > 0
              ? wingedByProfile.full_name
              : typeof wingedByProfile?.contact_name === "string" &&
                  wingedByProfile.contact_name.trim().length > 0
                ? wingedByProfile.contact_name
                : typeof sharedMatch.sender_handle === "string"
                  ? sharedMatch.sender_handle
              : "",
        };
        wingedInviteToken =
          typeof sharedMatch.created_at === "string"
            ? sharedMatch.created_at
            : `${sharedMatch.matched_user_id}:${sharedMatch.sender_id ?? ""}:${sharedMatch.sender_handle ?? ""}`;
      }
    }

    const userContactSummary =
      formatContactLine(
        typeof profile?.contact_method === "string" ? profile.contact_method : "",
        typeof profile?.contact_name === "string" ? profile.contact_name : "",
      ) || "Not set yet";

    const senderHandle =
      typeof profile?.full_name === "string" && profile.full_name.trim().length > 0
        ? profile.full_name
        : typeof profile?.contact_name === "string" && profile.contact_name.trim().length > 0
          ? profile.contact_name
          : typeof profile?.contact_method === "string"
            ? profile.contact_method
            : "";

    const matches: [HomeInviteMatch, HomeInviteMatch] = [inviteA, inviteB];

    return (
      <div className="min-h-full flex-1 bg-zinc-950 text-zinc-100">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(250,250,249,0.06),transparent)]" />
        <main className="relative z-10 mx-auto flex max-w-5xl flex-1 flex-col items-center px-4 py-6 md:px-8 md:py-10">
          <HomeInviteSection
            userId={user.id}
            matches={matches}
            wingedMatch={wingedInvite}
            wingedMatchToken={wingedInviteToken}
            userContactSummary={userContactSummary}
            senderHandle={senderHandle}
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
