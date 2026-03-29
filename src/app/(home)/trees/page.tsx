import { createClient, createServiceClient } from "@/lib/supabase/server";
import { TreesList } from "./trees-list";

export default async function TreesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const serviceClient = createServiceClient();
  const { data: recentTrees } = await serviceClient
    .from("research_trees")
    .select("arxiv_id, root_title, node_count, tree_data, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const trees = (recentTrees || []).map(({ tree_data, ...rest }) => ({
    ...rest,
    node_count: rest.node_count || (tree_data?.nodes?.length ?? 0),
  }));

  return <TreesList trees={trees} />;
}
