import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { computeUnlocked } from "@/lib/achievements";
import { AchievementsGrid } from "./achievements-grid";
import { ProfileForm } from "./profile-form";
import { AvatarDisplay } from "./avatar-upload";

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-gray-400">Supabase not configured.</p>;
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const userId = authData.user.id;
  const email = authData.user.email ?? "";

  const serviceClient = createServiceClient();

  const [
    profileResult,
    paperCountResult,
    summarizedCountResult,
    mapResult,
    chatResult,
  ] = await Promise.all([
    serviceClient
      .from("user_profiles")
      .select("display_name, bio, avatar_url")
      .eq("user_id", userId)
      .maybeSingle(),
    serviceClient
      .from("paper_summaries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    serviceClient
      .from("paper_summaries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("summary", "is", null),
    serviceClient
      .from("paper_maps")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
    serviceClient
      .from("chat_conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const profile = profileResult.data;
  const paperCount = paperCountResult.count ?? 0;
  const summarizedCount = summarizedCountResult.count ?? 0;
  const hasMap = !!mapResult.data;
  const hasChat = (chatResult.count ?? 0) > 0;

  const unlockedIds = computeUnlocked({ paperCount, summarizedCount, hasMap, hasChat });

  const displayName = profile?.display_name ?? null;
  const bio = profile?.bio ?? null;
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <div className="flex items-start gap-5">
        <AvatarDisplay
          avatarUrl={avatarUrl}
          displayName={displayName}
          email={email}
          size="lg"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="truncate text-lg font-semibold text-gray-900">
            {displayName || email}
          </h1>
          {displayName && (
            <p className="text-sm text-gray-400">{email}</p>
          )}
          <ProfileForm
            userId={userId}
            email={email}
            displayName={displayName}
            bio={bio}
            avatarUrl={avatarUrl}
          />
        </div>
      </div>

      {/* Bio */}
      {bio ? (
        <p className="text-sm leading-relaxed text-gray-600">{bio}</p>
      ) : (
        <p className="text-sm italic text-gray-300">No bio yet.</p>
      )}

      {/* Stats */}
      <div className="flex gap-6 text-sm text-gray-500">
        <span>
          <span className="font-semibold text-gray-900">{paperCount}</span>{" "}
          {paperCount === 1 ? "paper" : "papers"} saved
        </span>
        <span>
          <span className="font-semibold text-gray-900">{summarizedCount}</span>{" "}
          {summarizedCount === 1 ? "summary" : "summaries"} generated
        </span>
      </div>

      {/* Achievements */}
      <AchievementsGrid unlockedIds={unlockedIds} />
    </div>
  );
}
