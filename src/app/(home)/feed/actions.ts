"use server";

import { revalidateTag } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { FeedPaper } from "./feed-client";

export async function refreshFeedAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  revalidateTag(`feed-${user.id}`);
}

export async function savePaperAction(paper: FeedPaper): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const serviceClient = createServiceClient();
  await serviceClient.from("paper_summaries").upsert(
    {
      arxiv_id: paper.arxiv_id,
      user_id: user.id,
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      summary: null,
    },
    { onConflict: "arxiv_id,user_id", ignoreDuplicates: true }
  );
}
