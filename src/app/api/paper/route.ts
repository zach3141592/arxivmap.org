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

  const arxivId = request.nextUrl.searchParams.get("id");
  if (!arxivId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("paper_summaries")
    .select("arxiv_id, title, authors, abstract, summary, created_at")
    .eq("arxiv_id", arxivId)
    .eq("user_id", authData.user.id)
    .single();

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

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

  await serviceClient
    .from("paper_summaries")
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

  const { id, title, starred } = await request.json();
  if (!id || (title === undefined && starred === undefined)) {
    return NextResponse.json({ error: "Missing id or update fields" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (starred !== undefined) update.starred = starred;

  const serviceClient = createServiceClient();

  await serviceClient
    .from("paper_summaries")
    .update(update)
    .eq("arxiv_id", id)
    .eq("user_id", authData.user.id);

  return NextResponse.json({ ok: true });
}
