import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { generateMapClusters, buildMapData, StoredMapData } from "@/lib/paper-map-ai";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  const { data: mapRow } = await serviceClient
    .from("paper_maps")
    .select("map_data, paper_count")
    .eq("user_id", authData.user.id)
    .single();

  const { count } = await serviceClient
    .from("paper_summaries")
    .select("arxiv_id", { count: "exact", head: true })
    .eq("user_id", authData.user.id);

  const paperCount = count ?? 0;

  if (!mapRow) {
    return NextResponse.json({ map_data: null, is_stale: paperCount > 0 });
  }

  return NextResponse.json({
    map_data: mapRow.map_data,
    is_stale: mapRow.paper_count !== paperCount,
  });
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

  if (!rateLimit(authData.user.id).ok) {
    return new Response("Too many requests", { status: 429 });
  }

  const serviceClient = createServiceClient();

  // Fetch all user's papers
  const { data: papers } = await serviceClient
    .from("paper_summaries")
    .select("arxiv_id, title, authors, abstract")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (!papers || papers.length === 0) {
    return new Response("No papers found", { status: 400 });
  }

  // Cache check: if paper_count matches, return cached
  const { data: cached } = await serviceClient
    .from("paper_maps")
    .select("map_data, paper_count")
    .eq("user_id", authData.user.id)
    .single();

  if (cached && cached.paper_count === papers.length) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify(cached.map_data)}\n\n`
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
        controller.enqueue(
          encoder.encode(
            `event: progress\ndata: ${JSON.stringify({ step: "Analyzing papers...", progress: 0.2 })}\n\n`
          )
        );

        const clusters = await generateMapClusters(papers);

        controller.enqueue(
          encoder.encode(
            `event: progress\ndata: ${JSON.stringify({ step: "Computing layout...", progress: 0.7 })}\n\n`
          )
        );

        const mapData = buildMapData(clusters, papers);

        controller.enqueue(
          encoder.encode(
            `event: progress\ndata: ${JSON.stringify({ step: "Saving...", progress: 0.9 })}\n\n`
          )
        );

        // Upsert into paper_maps
        await serviceClient
          .from("paper_maps")
          .upsert({
            user_id: authData.user!.id,
            map_data: mapData,
            paper_count: papers.length,
            updated_at: new Date().toISOString(),
          });

        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify(mapData)}\n\n`
          )
        );
        controller.close();
      } catch (err) {
        console.error("Paper map generation error:", err);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: "Failed to generate paper map" })}\n\n`
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
