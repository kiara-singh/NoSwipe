import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ChatClient } from "./chat-client";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-full flex-1 flex-col bg-[#fafafa] px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            NoSwipe
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
            Onboarding
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Chat with the match agent—your answers shape how we understand your
            vibe.
          </p>
        </div>
        <ChatClient />
      </div>
    </main>
  );
}
