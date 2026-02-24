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
    .eq("user_id", authData.user.id)
    .single();

  if (!treeRow) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-semibold">Tree not found</h1>
          <p className="text-sm text-gray-400">
            No research tree found for ID: {rootPaperId}
          </p>
          <a
            href="/"
            className="mt-2 rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-black"
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
