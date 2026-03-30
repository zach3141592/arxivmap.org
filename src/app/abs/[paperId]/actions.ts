"use server";

import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchArxivPaper } from "@/lib/arxiv";
import { summarizePaper } from "@/lib/summarize";
import { generatePrerequisites, type Prerequisite } from "@/lib/prerequisites";
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

export type PrerequisitesResult = {
  status: "idle";
} | {
  status: "success";
  prerequisites: Prerequisite[];
} | {
  status: "error";
  message: string;
};

export async function generatePrerequisitesAction(
  _prevState: PrerequisitesResult,
  formData: FormData
): Promise<PrerequisitesResult> {
  const paperId = formData.get("paperId") as string;
  if (!paperId) return { status: "error", message: "Missing paper ID." };

  if (!isSupabaseConfigured()) return { status: "error", message: "Service not configured." };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { status: "error", message: "You must be signed in." };

  if (!rateLimit(authData.user.id).ok) {
    return { status: "error", message: "Too many requests. Please wait a moment." };
  }

  const serviceClient = createServiceClient();

  // Check cache
  const { data: cached } = await serviceClient
    .from("paper_summaries")
    .select("prerequisites, title, abstract")
    .eq("arxiv_id", paperId)
    .eq("user_id", authData.user.id)
    .single();

  if (cached?.prerequisites) {
    return { status: "success", prerequisites: cached.prerequisites as Prerequisite[] };
  }

  // Need title + abstract — use cached row or fetch from arXiv
  let title: string;
  let abstract: string;
  if (cached?.title && cached?.abstract) {
    title = cached.title;
    abstract = cached.abstract;
  } else {
    const paper = await fetchArxivPaper(paperId);
    if (!paper) return { status: "error", message: "Could not fetch paper from arXiv." };
    title = paper.title;
    abstract = paper.abstract;
  }

  let prerequisites: Prerequisite[];
  try {
    prerequisites = await generatePrerequisites(title, abstract);
  } catch (err) {
    console.error("Prerequisites generation failed:", err instanceof Error ? err.message : String(err));
    return { status: "error", message: "Generation failed. Please try again." };
  }

  await serviceClient
    .from("paper_summaries")
    .update({ prerequisites })
    .eq("arxiv_id", paperId)
    .eq("user_id", authData.user.id);

  return { status: "success", prerequisites };
}

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
    console.error("Summarization failed:", err instanceof Error ? err.message : String(err));
    return { status: "error", message: "Summarization failed. Please try again." };
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
