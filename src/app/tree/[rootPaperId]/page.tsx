import { redirect } from "next/navigation";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { TreePageContent } from "./tree-page-content";

export default async function TreePage({
  params,
}: {
  params: Promise<{ rootPaperId: string }>;
}) {
  const { rootPaperId } = await params;

  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    redirect(`/?returnTo=/tree/${rootPaperId}`);
  }

  const serviceClient = createServiceClient();
  const { data: treeRow } = await serviceClient
    .from("research_trees")
    .select("arxiv_id, root_title, tree_data")
    .eq("arxiv_id", rootPaperId)
    .single();

  if (!treeRow) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">Tree not found</h1>
          <p className="text-sm text-gray-600">
            No research tree found for ID: {rootPaperId}
          </p>
          <a
            href="/"
            className="border border-black px-6 py-2 text-sm font-medium transition-colors hover:bg-black hover:text-white"
          >
            Go home
          </a>
        </div>
      </div>
    );
  }

  return (
    <TreePageContent
      rootTitle={treeRow.root_title || rootPaperId}
      tree={treeRow.tree_data}
    />
  );
}
