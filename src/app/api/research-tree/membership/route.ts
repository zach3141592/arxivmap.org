import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paperId = request.nextUrl.searchParams.get("paperId");
  if (!paperId) {
    return NextResponse.json({ error: "Missing paperId" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Find all trees containing this paper
  const { data: memberships } = await serviceClient
    .from("research_tree_papers")
    .select("tree_arxiv_id")
    .eq("paper_arxiv_id", paperId);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ trees: [] });
  }

  const treeIds = memberships.map((m) => m.tree_arxiv_id);

  // Fetch the full tree data for each
  const { data: trees } = await serviceClient
    .from("research_trees")
    .select("arxiv_id, root_title, tree_data")
    .in("arxiv_id", treeIds);

  return NextResponse.json({ trees: trees || [] });
}
