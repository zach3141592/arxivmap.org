import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PaperInput } from "./paper-input";
import { LandingInput } from "./landing-input";
import { HomeTabs } from "./home-tabs";

export default async function Home() {
  let user = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <main className="flex w-full max-w-lg flex-col items-center">
          <h1 className="flex items-center gap-3 text-4xl font-medium tracking-tight text-gray-900 sm:text-5xl">
            <img src="/arxivmap.png" alt="" className="h-10 w-10 sm:h-12 sm:w-12" />
            Arxiv Map
          </h1>
          <p className="mt-3 text-sm tracking-wide text-gray-400">
            AI-powered paper summaries
          </p>
          <LandingInput />
        </main>
        <footer className="mt-20">
          <a
            href="/login"
            className="text-sm text-gray-400 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-gray-600 hover:decoration-gray-400"
          >
            Login
          </a>
        </footer>
      </div>
    );
  }

  // Fetch recent summaries and trees for this user
  const serviceClient = createServiceClient();
  const { data: recentPapers } = await serviceClient
    .from("paper_summaries")
    .select("arxiv_id, title, authors, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: recentTrees } = await serviceClient
    .from("research_trees")
    .select("arxiv_id, root_title, node_count, tree_data, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Backfill node_count from tree_data for trees saved before the column was populated
  const trees = (recentTrees || []).map(({ tree_data, ...rest }) => ({
    ...rest,
    node_count: rest.node_count || (tree_data?.nodes?.length ?? 0),
  }));

  // Collect tree data for the map view
  const treeDataList = (recentTrees || [])
    .filter((t) => t.tree_data)
    .map((t) => t.tree_data);

  // Fetch cached paper map
  const { data: mapRow } = await serviceClient
    .from("paper_maps")
    .select("map_data, paper_count")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <a href="/" className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight">
            <img src="/arxivmap.png" alt="" className="h-6 w-6" />
            Arxiv Map
          </a>
          <PaperInput compact />
        </div>
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

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <HomeTabs
          papers={recentPapers || []}
          trees={trees}
          treeDataList={treeDataList}
          cachedMap={mapRow?.map_data ?? null}
          mapIsStale={mapRow ? mapRow.paper_count !== (recentPapers?.length ?? 0) : (recentPapers?.length ?? 0) > 0}
        />
      </main>
    </div>
  );
}
