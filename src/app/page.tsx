import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PaperInput } from "./paper-input";
import { LandingInput } from "./landing-input";
import { HomeTabs } from "./home-tabs";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  let user = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <main className="flex flex-col items-center">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            Arxiv Map
          </h1>
          <p className="mt-4 text-base text-gray-400">
            AI-powered paper summaries
          </p>
          <LandingInput />
          <div className="mt-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-300">or</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          <SignInButton returnTo={returnTo} />
        </main>
      </div>
    );
  }

  // Fetch recent summaries and trees for this user
  const serviceClient = createServiceClient();
  const { data: recentPapers } = await serviceClient
    .from("paper_summaries")
    .select("arxiv_id, title, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: recentTrees } = await serviceClient
    .from("research_trees")
    .select("arxiv_id, root_title, node_count, tree_data, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Backfill node_count from tree_data for trees saved before the column was populated
  const trees = (recentTrees || []).map(({ tree_data, ...rest }) => ({
    ...rest,
    node_count: rest.node_count || (tree_data?.nodes?.length ?? 0),
  }));

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sm:px-8">
        <a href="/" className="text-base font-semibold tracking-tight">Arxiv Map</a>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-400 sm:inline">{user.email}</span>
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

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="flex flex-col items-center gap-5">
          <h2 className="text-sm font-medium text-gray-400">Look up a paper</h2>
          <PaperInput />
        </section>

        <HomeTabs
          papers={recentPapers || []}
          trees={trees}
        />
      </main>
    </div>
  );
}

function SignInButton({ returnTo }: { returnTo?: string }) {
  return (
    <form action="/auth/login" method="POST" className="mt-8">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <button
        type="submit"
        className="rounded-full bg-gray-900 px-7 py-3 text-sm font-medium text-white transition-all hover:bg-black hover:shadow-lg active:scale-[0.98]"
      >
        Sign in with Google
      </button>
    </form>
  );
}
