import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { Calendar, UserRound } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { SignOutButton } from "./sign-out-button";
import { ProfileEditForm } from "./profile-edit-form";
import { UpcomingDatesClient } from "./upcoming-dates-client";
import { FriendsClient } from "./friends-client";
import { formatContactLine } from "@/lib/contact-platforms";

export default async function ProfilePage() {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, contact_method, contact_name")
    .eq("id", user.id)
    .maybeSingle();

  const contactSummary = formatContactLine(
    typeof profile?.contact_method === "string" ? profile.contact_method : "",
    typeof profile?.contact_name === "string" ? profile.contact_name : "",
  );

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-[#000208] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-18%,rgba(30,58,138,0.07),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_48%_38%_at_100%_100%,rgba(23,37,84,0.09),transparent)]"
      />

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-6 md:py-16">
        <div className="mb-6 md:mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-700">
            Profile
          </p>
        </div>
        <div className="space-y-6 rounded-2xl border border-white/[0.04] bg-[#020508]/98 p-8 shadow-2xl shadow-black/70 backdrop-blur-md md:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={`${profile.full_name ?? "Profile"} avatar`}
                  className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-slate-800"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#060d14] text-slate-500 ring-1 ring-slate-900">
                  <UserRound className="h-7 w-7" strokeWidth={1.5} aria-hidden />
                </span>
              )}
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
                  {profile?.full_name?.trim()
                    ? profile.full_name
                    : "Name not set yet"}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {user.email ?? "No email on file"}
                </p>
                {contactSummary ? (
                  <p className="mt-2 text-sm text-slate-500">
                    <span className="text-slate-600">Reach you at </span>
                    <span className="font-medium text-slate-300">{contactSummary}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <SignOutButton />
          </div>

          <ProfileEditForm
            initialFullName={profile?.full_name ?? ""}
            initialContactPlatform={
              typeof profile?.contact_method === "string"
                ? profile.contact_method
                : ""
            }
            initialContactName={
              typeof profile?.contact_name === "string" ? profile.contact_name : ""
            }
          />

          <div className="rounded-xl border border-white/[0.04] bg-[#010407]/95 p-5">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4 text-blue-800/75" aria-hidden />
              <h2 className="text-sm font-semibold tracking-tight">Upcoming dates</h2>
            </div>
            <UpcomingDatesClient userId={user.id} />
          </div>

          <FriendsClient userId={user.id} />
        </div>
      </main>
    </div>
  );
}
