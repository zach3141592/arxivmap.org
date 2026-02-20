import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { generateResearchTree } from "@/lib/research-tree";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const arxivId = request.nextUrl.searchParams.get("id");
  if (!arxivId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Junction table rows cascade-delete via FK, but delete explicitly to be safe
  await serviceClient
    .from("research_tree_papers")
    .delete()
    .eq("tree_arxiv_id", arxivId)
    .eq("tree_user_id", authData.user.id);

  await serviceClient
    .from("research_trees")
    .delete()
    .eq("arxiv_id", arxivId)
    .eq("user_id", authData.user.id);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, root_title } = await request.json();
  if (!id || !root_title) {
    return NextResponse.json({ error: "Missing id or root_title" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  await serviceClient
    .from("research_trees")
    .update({ root_title })
    .eq("arxiv_id", id)
    .eq("user_id", authData.user.id);

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return new Response("Not configured", { status: 500 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { paperId, title, abstract, authors } = await request.json();
  if (!paperId || !abstract) {
    return new Response("Missing paperId or abstract", { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Cache check — scoped to this user
  const { data: cached } = await serviceClient
    .from("research_trees")
    .select("tree_data")
    .eq("arxiv_id", paperId)
    .eq("user_id", authData.user.id)
    .single();

  if (cached) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify(cached.tree_data)}\n\n`
          )
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Generate with progress streaming
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const tree = await generateResearchTree(
          paperId,
          title || "",
          abstract,
          authors || "",
          (step, progress) => {
            controller.enqueue(
              encoder.encode(
                `event: progress\ndata: ${JSON.stringify({ step, progress })}\n\n`
              )
            );
          }
        );

        // Cache result + populate denormalized columns and junction table
        const rootNode = tree.nodes.find((n: { id: string }) => n.id === tree.root);
        const rootTitle = rootNode?.title || title || "";
        const nodeCount = tree.nodes.length;

        await serviceClient
          .from("research_trees")
          .upsert({
            arxiv_id: paperId,
            user_id: authData.user.id,
            tree_data: tree,
            root_title: rootTitle,
            node_count: nodeCount,
          });

        // Populate junction table: delete old entries, insert new
        await serviceClient
          .from("research_tree_papers")
          .delete()
          .eq("tree_arxiv_id", paperId)
          .eq("tree_user_id", authData.user.id);

        const junctionRows = tree.nodes.map((n: { id: string }) => ({
          tree_arxiv_id: paperId,
          tree_user_id: authData.user.id,
          paper_arxiv_id: n.id,
        }));
        await serviceClient
          .from("research_tree_papers")
          .insert(junctionRows);

        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify(tree)}\n\n`
          )
        );
        controller.close();
      } catch (err) {
        console.error("Research tree generation error:", err);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: "Failed to generate research tree" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
