import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PaperInput } from "./paper-input";
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
      <div className="flex min-h-screen items-center justify-center">
        <main className="flex flex-col items-center gap-8">
          <h1 className="text-5xl font-bold tracking-tight">Arxiv Map</h1>
          <p className="text-lg text-gray-600">AI-powered paper summaries</p>
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
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">Arxiv Map</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="border border-black px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <section className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-medium">Look up a paper</h2>
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
    <form action="/auth/login" method="POST">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <button
        type="submit"
        className="border border-black px-6 py-2 text-sm font-medium transition-colors hover:bg-black hover:text-white"
      >
        Sign in with Google
      </button>
    </form>
  );
}
