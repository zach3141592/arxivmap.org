import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchArxivPaper } from "@/lib/arxiv";
import { NextResponse } from "next/server";

const MAX_IDS = 50;
const CONCURRENCY = 5;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const rawIds: unknown[] = Array.isArray(body.arxiv_ids) ? body.arxiv_ids : [];

  const ids = [
    ...new Set(
      rawIds
        .filter((id): id is string => typeof id === "string" && /^\d{4}\.\d{4,5}$/.test(id))
        .slice(0, MAX_IDS)
    ),
  ];

  if (ids.length === 0) {
    return NextResponse.json({ added: 0, failed: [], total: 0 });
  }

  const serviceClient = createServiceClient();
  const added: string[] = [];
  const failed: string[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      try {
        const paper = await fetchArxivPaper(id);
        if (!paper) {
          failed.push(id);
          continue;
        }
        const { error } = await serviceClient.from("paper_summaries").upsert(
          {
            arxiv_id: id,
            user_id: authData.user!.id,
            title: paper.title,
            authors: paper.authors,
            abstract: paper.abstract,
            summary: null,
          },
          { onConflict: "arxiv_id,user_id", ignoreDuplicates: true }
        );
        if (error) failed.push(id);
        else added.push(id);
      } catch {
        failed.push(id);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

  return NextResponse.json({ added: added.length, failed, total: ids.length });
}
