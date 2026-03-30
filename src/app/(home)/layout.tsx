import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HeaderNav } from "../header-nav";
import { MobileBottomNav } from "../mobile-bottom-nav";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  let profile: { display_name: string | null; avatar_url: string | null } | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const serviceClient = createServiceClient();
      const { data: profileData } = await serviceClient
        .from("user_profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      profile = profileData ?? null;
    }
  }

  if (!user) {
    redirect("/login");
  }

  const avatarLetter = (profile?.display_name || user!.email)?.[0]?.toUpperCase() ?? "?";

  let githubStars: number | null = null;
  try {
    const res = await fetch("https://api.github.com/repos/zach3141592/arxivmap.org", {
      next: { revalidate: 3600 },
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.ok) {
      const json = await res.json();
      githubStars = json.stargazers_count ?? null;
    }
  } catch {
    // non-critical, show button without count
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-8">
        <a href="/" className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight">
          <img src="/arxivmap.png" alt="" className="h-6 w-6" />
          <span>Arxiv Map</span>
        </a>

        {/* Desktop nav — hidden on mobile */}
        <div className="hidden lg:block">
          <HeaderNav />
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/zach3141592/arxivmap.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:border-gray-400 hover:text-gray-900 sm:flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Star
            {githubStars !== null && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                {githubStars >= 1000 ? `${(githubStars / 1000).toFixed(1)}k` : githubStars}
              </span>
            )}
          </a>
          <a href="/profile" className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-medium text-gray-500">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                avatarLetter
              )}
            </div>
            <span className="hidden text-sm text-gray-400 sm:inline">
              {profile?.display_name || user!.email}
            </span>
          </a>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-500 transition-all hover:border-gray-400 hover:text-gray-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main content — extra bottom padding on mobile so content clears the nav bar */}
      <main className="mx-auto max-w-2xl px-4 py-8 pb-24 sm:px-6 sm:py-12 lg:pb-12">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
