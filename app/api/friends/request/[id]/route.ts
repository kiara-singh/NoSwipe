import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type UpdateBody = {
  status?: "accepted" | "declined";
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const requestId = typeof id === "string" ? id.trim() : "";
    if (!requestId) {
      return NextResponse.json({ error: "Request id is required." }, { status: 400 });
    }

    const body = (await req.json()) as UpdateBody;
    const nextStatus = body.status;
    if (nextStatus !== "accepted" && nextStatus !== "declined") {
      return NextResponse.json(
        { error: "status must be accepted or declined." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("friend_requests")
      .update({ status: nextStatus })
      .eq("id", requestId)
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("friends request update error:", updateError);
      return NextResponse.json(
        { error: "Could not update request." },
        { status: 500 },
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Request not found or not actionable." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("friends request patch route error:", error);
    return NextResponse.json(
      { error: "Could not update request." },
      { status: 500 },
    );
  }
}
