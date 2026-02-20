import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
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

  await serviceClient
    .from("paper_summaries")
    .delete()
    .eq("arxiv_id", arxivId);

  return NextResponse.json({ ok: true });
}
