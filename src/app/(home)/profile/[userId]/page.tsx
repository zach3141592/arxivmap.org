import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type { AchievementStats } from "@/lib/achievements";
import { AchievementsGrid } from "../achievements-grid";
import { AvatarDisplay } from "../avatar-upload";
import { StarredPapers } from "../starred-papers";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-gray-400">Supabase not configured.</p>;
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { userId } = await params;

  // Redirect to own profile page for cleaner URL
  if (userId === authData.user.id) {
    redirect("/profile");
  }

  const serviceClient = createServiceClient();

  const [
    profileResult,
    paperCountResult,
    summarizedCountResult,
    mapResult,
    chatResult,
    starredResult,
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
    serviceClient
      .from("paper_summaries")
      .select("arxiv_id, title, authors, created_at")
      .eq("user_id", userId)
      .eq("starred", true)
      .order("created_at", { ascending: false }),
  ]);

  // If no profile row and no papers, this user doesn't exist
  if (!profileResult.data && (paperCountResult.count ?? 0) === 0) {
    notFound();
  }

  const profile = profileResult.data;
  const paperCount = paperCountResult.count ?? 0;
  const summarizedCount = summarizedCountResult.count ?? 0;
  const hasMap = !!mapResult.data;
  const hasChat = (chatResult.count ?? 0) > 0;
  const starredPapers = starredResult.data ?? [];

  const achievementStats: AchievementStats = { paperCount, summarizedCount, hasMap, hasChat };

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
          email=""
          size="lg"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="truncate text-lg font-semibold text-gray-900">
            {displayName || "Anonymous researcher"}
          </h1>
        </div>
      </div>

      {/* Bio */}
      {bio && (
        <p className="text-sm leading-relaxed text-gray-600">{bio}</p>
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
      <AchievementsGrid stats={achievementStats} />

      {/* Starred papers */}
      <StarredPapers papers={starredPapers} isOwn={false} />
    </div>
  );
}
