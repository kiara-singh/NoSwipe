import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type PreviewBody = {
  contact_method?: string;
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

    const body = (await req.json()) as PreviewBody;
    const contactMethod =
      typeof body.contact_method === "string" ? body.contact_method.trim() : "";
    const normalizedHandle = contactMethod.replace(/^@+/, "");
    const handleCandidates = Array.from(
      new Set([normalizedHandle, `@${normalizedHandle}`].filter(Boolean)),
    );

    if (!contactMethod) {
      return NextResponse.json(
        { error: "contact_method is required." },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, contact_name")
      .in("contact_name", handleCandidates)
      .neq("id", user.id)
      .limit(1)
      .maybeSingle();

    const { data: meProfile, error: meProfileError } = await supabase
      .from("profiles")
      .select("id, contact_name")
      .eq("id", user.id)
      .maybeSingle();

    const normalizedSelfHandle =
      typeof meProfile?.contact_name === "string"
        ? meProfile.contact_name.trim().replace(/^@+/, "").toLowerCase()
        : "";
    const normalizedSearchHandle = normalizedHandle.toLowerCase();

    if (
      !profile &&
      normalizedSelfHandle.length > 0 &&
      normalizedSearchHandle === normalizedSelfHandle &&
      !meProfileError
    ) {
      return NextResponse.json(
        { error: "That is your own handle. Search for another user." },
        { status: 400 },
      );
    }

    if (profileError) {
      console.error("friends preview lookup error:", profileError);
      return NextResponse.json(
        { error: "Could not look up user." },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("friends preview route error:", error);
    return NextResponse.json(
      { error: "Could not look up user." },
      { status: 500 },
    );
  }
}
