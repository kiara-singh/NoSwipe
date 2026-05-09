import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type FriendRequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  contact_name: string | null;
};

type FriendRequestWithProfile = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  profile: ProfileRow | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rows, error: requestsError } = await supabase
      .from("friend_requests")
      .select("id, sender_id, receiver_id, status, created_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("friends requests query error:", requestsError);
      return NextResponse.json(
        { error: "Could not load friend requests." },
        { status: 500 },
      );
    }

    const requestRows = (rows ?? []) as FriendRequestRow[];
    const otherUserIds = Array.from(
      new Set(
        requestRows.map((row) =>
          row.sender_id === user.id ? row.receiver_id : row.sender_id,
        ),
      ),
    );

    let profilesById = new Map<string, ProfileRow>();
    if (otherUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, contact_name")
        .in("id", otherUserIds);

      if (profilesError) {
        console.error("friends profiles query error:", profilesError);
        return NextResponse.json(
          { error: "Could not load friend requests." },
          { status: 500 },
        );
      }

      profilesById = new Map(
        ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
      );
    }

    const withProfiles: FriendRequestWithProfile[] = requestRows.map((row) => {
      const otherId = row.sender_id === user.id ? row.receiver_id : row.sender_id;
      return {
        ...row,
        profile: profilesById.get(otherId) ?? null,
      };
    });

    const incoming = withProfiles.filter(
      (row) => row.receiver_id === user.id && row.status === "pending",
    );
    const outgoing = withProfiles.filter(
      (row) => row.sender_id === user.id && row.status === "pending",
    );
    const accepted = withProfiles.filter((row) => row.status === "accepted");

    return NextResponse.json(
      { incoming, outgoing, accepted },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("friends requests route error:", error);
    return NextResponse.json(
      { error: "Could not load friend requests." },
      { status: 500 },
    );
  }
}
