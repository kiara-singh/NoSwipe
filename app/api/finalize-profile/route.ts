import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type ChatMessage = { role: "user" | "model"; content: string };

const FINALIZE_INSTRUCTION = `You are analyzing a NoSwipe onboarding chat. Read the full conversation and output ONLY valid JSON (no markdown) with exactly two keys:
- "vibe": a string of exactly three words summarizing the user's personality (e.g. "curious, grounded, playful").
- "intent": a short string describing what they want out of dating (one or two sentences max).`;

const FINALIZE_MODEL = "llama-3.3-70b-versatile";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages, imageUrl, full_name, contact_method, contact_name } =
      body as {
        messages?: ChatMessage[];
        imageUrl?: string | null;
        full_name?: string | null;
        /** Platform (e.g. Instagram). */
        contact_method?: string | null;
        /** Handle / username / phone. */
        contact_name?: string | null;
      };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid messages." },
        { status: 400 },
      );
    }

    const transcript = messages
      .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.content}`)
      .join("\n\n");

    const completion = await groq.chat.completions.create({
      model: FINALIZE_MODEL,
      messages: [
        { role: "system", content: FINALIZE_INSTRUCTION },
        {
          role: "user",
          content: `Conversation:\n\n${transcript}\n\nRespond with JSON only, shape: {"vibe": string, "intent": string}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let intentPayload: { vibe: string; intent: string };
    try {
      intentPayload = JSON.parse(raw) as { vibe: string; intent: string };
    } catch {
      return NextResponse.json(
        { error: "Could not parse model response." },
        { status: 502 },
      );
    }

    if (
      typeof intentPayload.vibe !== "string" ||
      typeof intentPayload.intent !== "string"
    ) {
      return NextResponse.json(
        { error: "Model returned invalid JSON shape." },
        { status: 502 },
      );
    }

    const updatePayload: {
      onboarding_completed: boolean;
      intent_data: { vibe: string; intent: string };
      avatar_url?: string;
      full_name?: string;
      contact_method?: string;
      contact_name?: string;
    } = {
      onboarding_completed: true,
      intent_data: intentPayload,
    };

    const cleanUrl =
      typeof imageUrl === "string" ? imageUrl.trim() : "";
    if (cleanUrl.length > 0) {
      updatePayload.avatar_url = cleanUrl;
    }

    const cleanName = typeof full_name === "string" ? full_name.trim() : "";
    if (cleanName.length > 0) {
      updatePayload.full_name = cleanName;
    }

    const cleanMethod =
      typeof contact_method === "string" ? contact_method.trim() : "";
    if (cleanMethod.length > 0) {
      updatePayload.contact_method = cleanMethod;
    }

    const cleanContactName =
      typeof contact_name === "string" ? contact_name.trim() : "";
    if (cleanContactName.length > 0) {
      updatePayload.contact_name = cleanContactName;
    }

    const { data: updated, error: dbError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id)
      .select("id");

    if (dbError) {
      console.error("Supabase update error:", dbError);
      return NextResponse.json(
        { error: "Failed to save profile." },
        { status: 500 },
      );
    }

    if (!updated?.length) {
      return NextResponse.json(
        {
          error:
            "No profile row found for this user. Create a `profiles` row (e.g. id = auth user id) or adjust RLS.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Finalize profile error:", error);
    return NextResponse.json(
      { error: "Failed to finalize profile." },
      { status: 500 },
    );
  }
}
