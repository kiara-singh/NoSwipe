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


const INVITE_JSON_MODEL = "llama-3.3-70b-versatile";
const INVITE_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours (demo-safe)
const INVITE_CACHE_VERSION = "v2";
const COMPATIBILITY_JSON_MODEL = "llama-3.3-70b-versatile";
const COMPATIBILITY_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const COMPATIBILITY_CACHE_VERSION = "v1";

const FALLBACK_MATCH: { date_idea: string; match_reasoning: string } = {
  date_idea: "Sunday Coffee & Book Swap at Blue Bottle",
  match_reasoning:
    "You and your match both value thoughtful, low-pressure connection and discover people best through shared rituals. A coffee + book swap gives you an easy starting point with enough depth for real chemistry to surface quickly.",
};

type InviteCacheEntry = {
  dateIdea: string;
  matchReasoning: string;
  expiresAt: number;
};

type CompatibilityCacheEntry = {
  score: number;
  reason: string;
  expiresAt: number;
};

type IntentSummary = { vibe: string; intent: string };

const inviteCache = new Map<string, InviteCacheEntry>();
const compatibilityCache = new Map<string, CompatibilityCacheEntry>();

function normalizeIntentPayload(
  payload: unknown,
  fallback: IntentSummary = {
    vibe: "intent not available",
    intent: "intent not available",
  },
): IntentSummary {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallback;
  }
  const candidate = payload as { vibe?: unknown; intent?: unknown };
  return {
    vibe: typeof candidate.vibe === "string" ? candidate.vibe : fallback.vibe,
    intent: typeof candidate.intent === "string" ? candidate.intent : fallback.intent,
  };
}

function tokenizeIntentText(input: string) {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3),
    ),
  );
}

function deterministicCompatibilityScore(viewer: IntentSummary, candidate: IntentSummary) {
  const viewerTokens = tokenizeIntentText(`${viewer.vibe} ${viewer.intent}`);
  const candidateTokens = tokenizeIntentText(`${candidate.vibe} ${candidate.intent}`);
  if (viewerTokens.length === 0 || candidateTokens.length === 0) {
    return { score: 50, reason: "Limited intent detail; using neutral compatibility." };
  }
  const candidateSet = new Set(candidateTokens);
  const overlap = viewerTokens.filter((token) => candidateSet.has(token)).length;
  const denominator = Math.max(viewerTokens.length, candidateTokens.length, 1);
  const overlapRatio = overlap / denominator;
  const score = Math.max(20, Math.min(95, Math.round(35 + overlapRatio * 60)));
  const reason =
    overlap > 0
      ? `Shared intent themes (${overlap} overlap keywords) suggest alignment.`
      : "Different intent keywords suggest moderate compatibility.";
  return { score, reason };
}

const MAX_HOME_MATCHES = 3;

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

    const { data: candidateProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, contact_method, contact_name, intent_data")
      .neq("id", user.id)
      .eq("onboarding_completed", true)
      .limit(40);

    const userIntent = normalizeIntentPayload(profile?.intent_data);
    const userId = user.id;

    function inviteCacheKey(candidateId: string, candidateName: string) {
      return `${INVITE_CACHE_VERSION}:${userId}:${candidateId}:${candidateName.toLowerCase()}:${INVITE_JSON_MODEL}`;
    }

    function compatibilityCacheKey(candidateId: string, candidateIntent: IntentSummary) {
      const viewerFingerprint = `${userIntent.vibe}::${userIntent.intent}`.toLowerCase();
      const candidateFingerprint =
        `${candidateIntent.vibe}::${candidateIntent.intent}`.toLowerCase();
      return `${COMPATIBILITY_CACHE_VERSION}:${userId}:${candidateId}:${viewerFingerprint}:${candidateFingerprint}:${COMPATIBILITY_JSON_MODEL}`;
    }

    async function scoreCandidateCompatibility(candidate: {
      id: string;
      name: string;
      intent: IntentSummary;
    }): Promise<{ score: number; reason: string }> {
      const cacheKey = compatibilityCacheKey(candidate.id, candidate.intent);
      const cached = compatibilityCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return { score: cached.score, reason: cached.reason };
      }

      const deterministic = deterministicCompatibilityScore(userIntent, candidate.intent);

      try {
        const systemInstruction = `You are a dating compatibility scorer. Compare two short intent summaries and return ONLY strict JSON with:
- score: integer from 0 to 100 (higher = better match)
- reason: one concise sentence explaining the score.
Score based on shared relationship pace, social energy, values, and date style fit.`;
        const userPrompt = `Viewer intent:
${JSON.stringify(userIntent)}

Candidate intent:
${JSON.stringify(candidate.intent)}

Return strict JSON: {"score": number, "reason": string}`;

        const completion = await groq.chat.completions.create({
          model: COMPATIBILITY_JSON_MODEL,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content ?? "";
        const parsed = JSON.parse(raw) as { score?: unknown; reason?: unknown };
        const parsedScore =
          typeof parsed.score === "number" ? Math.round(parsed.score) : Number.NaN;
        const finalScore = Number.isFinite(parsedScore)
          ? Math.max(0, Math.min(100, parsedScore))
          : deterministic.score;
        const finalReason =
          typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason
            : deterministic.reason;

        compatibilityCache.set(cacheKey, {
          score: finalScore,
          reason: finalReason,
          expiresAt: Date.now() + COMPATIBILITY_CACHE_TTL_MS,
        });

        return { score: finalScore, reason: finalReason };
      } catch (error) {
        console.error("Home compatibility scorer error:", error);
        compatibilityCache.set(cacheKey, {
          score: deterministic.score,
          reason: deterministic.reason,
          expiresAt: Date.now() + COMPATIBILITY_CACHE_TTL_MS,
        });
        return deterministic;
      }
    }

    async function generateInviteForProfile(candidate: {
      id: string;
      name: string;
      contact: string;
      contactPlatform: string;
      photoUrl: string;
      intent: { vibe: string; intent: string };
    }): Promise<HomeInviteMatch> {
      const cacheKey = inviteCacheKey(candidate.id, candidate.name);
      const cached = inviteCache.get(cacheKey);
      // #region agent log
      fetch("http://127.0.0.1:7854/ingest/140fb55f-ac43-45e4-920a-4e5d365e0f48", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "3a565f",
        },
        body: JSON.stringify({
          sessionId: "3a565f",
          runId: "lindsey-match-debug-1",
          hypothesisId: "H4",
          location: "app/page.tsx:generateInviteForProfile:cache-check",
          message: "Invite generation cache check",
          data: {
            candidateId: candidate.id,
            candidateName: candidate.name,
            cacheKey,
            cacheHit: Boolean(cached && cached.expiresAt > Date.now()),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (cached && cached.expiresAt > Date.now()) {
        return {
          matchedUserId: candidate.id,
          dateIdea: cached.dateIdea,
          matchReasoning: cached.matchReasoning,
          matchName: candidate.name,
          matchContact: candidate.contact,
          matchContactPlatform: candidate.contactPlatform,
          matchPhotoUrl: candidate.photoUrl,
        };
      }

      let matchData = FALLBACK_MATCH;
      try {
        const systemInstruction = `You are an elite matchmaker for NoSwipe. Return ONLY JSON with keys: date_idea and match_reasoning.
Writing rules: The invite is shown only to the member whose intent is labeled "yours". Always address them as "you". Refer to the suggested match by first name only (${candidate.name}). Never write "User A/User B", never use both people's full names in third person (e.g. avoid "Alex and Jordan both…"). Use "you and ${candidate.name}…" or "you both…" where "both" means you and ${candidate.name}. Keep match_reasoning in that voice.
date_idea must be a short label only: maximum 12 words, target ~6–10 words—like a calendar event title (activity + place or vibe). No explaining why, no "allowing you to…", no comma-run-on sentences; put all rationale in match_reasoning.`;
        const userPrompt = `Create one specific, low-friction date idea based on overlap between these two people.

Your intent (you are the member opening this invite):
${JSON.stringify(userIntent)}

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
          inviteCache.set(cacheKey, {
            dateIdea: parsed.date_idea,
            matchReasoning: parsed.match_reasoning,
            expiresAt: Date.now() + INVITE_CACHE_TTL_MS,
          });
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

    function toCandidate(profileId: string): {
      id: string;
      name: string;
      contact: string;
      contactPlatform: string;
      photoUrl: string;
      intent: { vibe: string; intent: string };
    } {
      const seeded = seededById.get(profileId);
      const seededIntent = normalizeIntentPayload(seeded?.intent_data, {
        vibe: "curious grounded playful",
        intent:
          "Looking for a warm, consistent connection built through shared routines and honest conversation.",
      });
      return {
        id: profileId,
        name:
          typeof seeded?.full_name === "string" && seeded.full_name.trim().length > 0
            ? seeded.full_name
            : "Match",
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
          vibe: seededIntent.vibe,
          intent: seededIntent.intent,
        },
      };
    }
    const namedCandidateProfiles = (candidateProfiles ?? []).filter(
      (candidate) =>
        typeof candidate.full_name === "string" && candidate.full_name.trim().length > 0,
    );
    const seededById = new Map(
      namedCandidateProfiles.map((profileRow) => [profileRow.id, profileRow]),
    );
    const orderedCandidateIds = namedCandidateProfiles
      .map((candidate) => candidate.id)
      .filter((profileId) => profileId !== user.id)
      .slice(0, MAX_HOME_MATCHES);
    // #region agent log
    fetch("http://127.0.0.1:7854/ingest/140fb55f-ac43-45e4-920a-4e5d365e0f48", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "3a565f",
      },
      body: JSON.stringify({
        sessionId: "3a565f",
        runId: "lindsey-match-debug-1",
        hypothesisId: "H3",
        location: "app/page.tsx:orderedCandidateIds",
        message: "Ordered candidate IDs for invite queue",
        data: {
          orderedCandidateIds,
          dynamicIdsCount: orderedCandidateIds.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const rankedCandidates = await Promise.all(
      orderedCandidateIds.map(async (profileId, index) => {
        const candidate = toCandidate(profileId);
        const compatibility = await scoreCandidateCompatibility(candidate);
        return {
          profileId,
          index,
          candidate,
          compatibility,
        };
      }),
    );

    rankedCandidates.sort((a, b) => {
      if (b.compatibility.score !== a.compatibility.score) {
        return b.compatibility.score - a.compatibility.score;
      }
      return a.index - b.index;
    });

    const rankedCandidateIds = rankedCandidates.map((entry) => entry.profileId);

    const matches = await Promise.all(
      rankedCandidateIds.map((profileId) => generateInviteForProfile(toCandidate(profileId))),
    );
    // #region agent log
    fetch("http://127.0.0.1:7854/ingest/140fb55f-ac43-45e4-920a-4e5d365e0f48", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "3a565f",
      },
      body: JSON.stringify({
        sessionId: "3a565f",
        runId: "lindsey-match-debug-1",
        hypothesisId: "H5",
        location: "app/page.tsx:matches-built",
        message: "Final built matches",
        data: {
          orderedCandidateIds,
          rankedCandidateIds,
          topCompatibilityScores: rankedCandidates.slice(0, 4).map((entry) => ({
            profileId: entry.profileId,
            score: entry.compatibility.score,
            reason: entry.compatibility.reason,
          })),
          matchesPreview: matches.slice(0, 4).map((m) => ({
            matchedUserId: m.matchedUserId,
            matchName: m.matchName,
            dateIdea: m.dateIdea,
          })),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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
