import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
        Onboarding
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Add the match-agent chat here to shape the user&apos;s profile.
      </p>
    </div>
  );
}
