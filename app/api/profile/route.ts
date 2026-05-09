import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(req: Request) {
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
    const { full_name, contact_method, contact_name } = body as {
      full_name?: string | null;
      
      contact_method?: string | null;
     
      contact_name?: string | null;
    };

    const updatePayload: {
      full_name?: string;
      contact_method?: string;
      contact_name?: string;
    } = {};

    if (typeof full_name === "string") {
      const t = full_name.trim();
      updatePayload.full_name = t.length > 0 ? t : "";
    }

    if (typeof contact_method === "string") {
      const t = contact_method.trim();
      updatePayload.contact_method = t.length > 0 ? t : "";
    }

    if (typeof contact_name === "string") {
      const t = contact_name.trim();
      updatePayload.contact_name = t.length > 0 ? t : "";
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    let updated: { id: string }[] | null = null;
    let dbError: { message: string } | null = null;

    if (existing) {
      const result = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id)
        .select("id");
      updated = result.data;
      dbError = result.error;
    } else {
      const result = await supabase
        .from("profiles")
        .insert({ id: user.id, ...updatePayload })
        .select("id");
      updated = result.data;
      dbError = result.error;
    }

    if (dbError) {
      console.error("Profile PATCH error:", dbError);
      return NextResponse.json(
        { error: dbError.message || "Failed to update profile." },
        { status: 500 },
      );
    }

    if (!updated?.length) {
      return NextResponse.json(
        { error: "No profile row found for this user." },
        { status: 404 },
      );
    }

    revalidatePath("/profile");
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile route error:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }
}
