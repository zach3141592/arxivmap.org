"use server";

import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchArxivPaper } from "@/lib/arxiv";
import { summarizePaper } from "@/lib/summarize";
import { rateLimit } from "@/lib/rate-limit";

export type SummarizeResult = {
  status: "idle";
} | {
  status: "success";
  summary: string;
} | {
  status: "error";
  message: string;
};

export async function summarizePaperAction(
  _prevState: SummarizeResult,
  formData: FormData
): Promise<SummarizeResult> {
  const paperId = formData.get("paperId") as string;
  if (!paperId) {
    return { status: "error", message: "Missing paper ID." };
  }

  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Service not configured." };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { status: "error", message: "You must be signed in to summarize papers." };
  }

  if (!rateLimit(authData.user.id).ok) {
    return { status: "error", message: "Too many requests. Please wait a moment." };
  }

  const serviceClient = createServiceClient();

  // Check cache first — scoped to this user
  const { data: cached } = await serviceClient
    .from("paper_summaries")
    .select("summary")
    .eq("arxiv_id", paperId)
    .eq("user_id", authData.user.id)
    .single();

  if (cached?.summary) {
    return { status: "success", summary: cached.summary };
  }

  // Fetch paper from arxiv
  const paper = await fetchArxivPaper(paperId);
  if (!paper) {
    return { status: "error", message: "Could not fetch paper from arXiv." };
  }

  // Summarize with Claude
  let summary: string;
  try {
    summary = await summarizePaper(paper.abstract);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Summarization failed:", msg);
    return { status: "error", message: `Summarization failed: ${msg}` };
  }

  // Cache in Supabase — scoped to this user
  await serviceClient.from("paper_summaries").upsert({
    arxiv_id: paperId,
    user_id: authData.user.id,
    title: paper.title,
    authors: paper.authors,
    abstract: paper.abstract,
    summary,
  });

  return { status: "success", summary };
}
