import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type ShareMatchBody = {
  senderId?: string;
  senderHandle?: string;
  receiverId?: string;
  matchedUserId?: string;
  pitchMessage?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const runId = "share-match-pre-fix-1";
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ShareMatchBody;
    const senderId = typeof body.senderId === "string" ? body.senderId.trim() : "";
    const senderHandle =
      typeof body.senderHandle === "string" ? body.senderHandle.trim() : "";
    const receiverId =
      typeof body.receiverId === "string" ? body.receiverId.trim() : "";
    const matchedUserId =
      typeof body.matchedUserId === "string" ? body.matchedUserId.trim() : "";
    const pitchMessage =
      typeof body.pitchMessage === "string" ? body.pitchMessage.trim() : "";

    // #region agent log
    fetch("http://127.0.0.1:7854/ingest/140fb55f-ac43-45e4-920a-4e5d365e0f48", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "4bcf0c",
      },
      body: JSON.stringify({
        sessionId: "4bcf0c",
        runId,
        hypothesisId: "H2",
        location: "app/api/share-match/route.ts:payload",
        message: "Parsed share-match payload in API",
        data: {
          senderId,
          receiverId,
          matchedUserId,
          matchedUserIdLooksUuid:
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              matchedUserId,
            ),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (!senderId || !senderHandle || !receiverId || !matchedUserId) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    if (!UUID_RE.test(matchedUserId)) {
      return NextResponse.json(
        {
          error:
            "This suggested match is demo-only and cannot be shared yet.",
        },
        { status: 400 },
      );
    }

    if (senderId !== user.id) {
      return NextResponse.json({ error: "Invalid sender." }, { status: 403 });
    }

    const { data: receiverProfile, error: receiverError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", receiverId)
      .maybeSingle();

    if (receiverError) {
      console.error("share-match receiver lookup error:", receiverError);
      return NextResponse.json(
        { error: "Could not find receiver profile." },
        { status: 500 },
      );
    }

    if (!receiverProfile) {
      return NextResponse.json(
        { error: "User not found. They need to join the app first!" },
        { status: 404 },
      );
    }

    const { error: insertError } = await supabase.from("shared_matches").insert({
      sender_id: senderId,
      sender_handle: senderHandle,
      receiver_id: receiverProfile.id,
      matched_user_id: matchedUserId,
      pitch_message: pitchMessage,
    });

    // #region agent log
    fetch("http://127.0.0.1:7854/ingest/140fb55f-ac43-45e4-920a-4e5d365e0f48", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "4bcf0c",
      },
      body: JSON.stringify({
        sessionId: "4bcf0c",
        runId,
        hypothesisId: "H4",
        location: "app/api/share-match/route.ts:insertResult",
        message: "Insert result for shared_matches",
        data: {
          hasInsertError: Boolean(insertError),
          insertErrorCode:
            insertError && typeof insertError === "object" && "code" in insertError
              ? (insertError as { code?: string }).code ?? null
              : null,
          matchedUserId,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (insertError) {
      console.error("share-match insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to route match." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("share-match route error:", error);
    return NextResponse.json({ error: "Failed to route match." }, { status: 500 });
  }
}
