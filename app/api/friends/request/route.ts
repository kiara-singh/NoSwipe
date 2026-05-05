import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type RequestBody = {
  receiverId?: string;
};

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

    const body = (await req.json()) as RequestBody;
    const receiverId =
      typeof body.receiverId === "string" ? body.receiverId.trim() : "";

    if (!receiverId) {
      return NextResponse.json(
        { error: "receiverId is required." },
        { status: 400 },
      );
    }

    if (receiverId === user.id) {
      return NextResponse.json(
        { error: "You cannot send a request to yourself." },
        { status: 400 },
      );
    }

    const { data: receiverProfile, error: receiverError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", receiverId)
      .maybeSingle();

    if (receiverError) {
      console.error("friends request receiver lookup error:", receiverError);
      return NextResponse.json(
        { error: "Could not send request." },
        { status: 500 },
      );
    }

    if (!receiverProfile) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const { error: insertError } = await supabase.from("friend_requests").insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: "pending",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Friend request already exists." },
          { status: 409 },
        );
      }
      console.error("friends request insert error:", insertError);
      return NextResponse.json(
        { error: "Could not send request." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("friends request route error:", error);
    return NextResponse.json({ error: "Could not send request." }, { status: 500 });
  }
}
