import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FeedClient, type FeedPaper } from "./feed-client";

async function fetchRecommendations(arxivIds: string[]): Promise<FeedPaper[]> {
  if (arxivIds.length === 0) return [];

  // Semantic Scholar multi-paper recommendations — accepts arXiv IDs
  const positivePaperIds = arxivIds.slice(0, 25).map((id) => `arXiv:${id}`);

  try {
    const res = await fetch(
      "https://api.semanticscholar.org/recommendations/v1/papers/?fields=title,authors,abstract,year,externalIds&limit=100",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positivePaperIds }),
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const savedSet = new Set(arxivIds);

    return (data.recommendedPapers ?? [])
      .filter((p: Record<string, unknown>) => {
        const ids = p.externalIds as Record<string, string> | undefined;
        return ids?.ArXiv && !savedSet.has(ids.ArXiv) && p.abstract;
      })
      .map((p: Record<string, unknown>) => {
        const ids = p.externalIds as Record<string, string>;
        const authors = (p.authors as { name: string }[] ?? [])
          .map((a) => a.name)
          .join(", ");
        return {
          arxiv_id: ids.ArXiv,
          title: (p.title as string) ?? "",
          authors,
          abstract: (p.abstract as string) ?? "",
          year: (p.year as number | null) ?? null,
        };
      });
  } catch {
    return [];
  }
}

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const serviceClient = createServiceClient();
  const { data: savedPapers } = await serviceClient
    .from("paper_summaries")
    .select("arxiv_id")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const savedIds = (savedPapers ?? []).map((p) => p.arxiv_id);

  if (savedIds.length === 0) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Feed</h1>
        <p className="mt-12 text-center text-sm text-gray-400">
          Save some papers first and your personalized feed will appear here.
        </p>
        <div className="mt-4 text-center">
          <a
            href="/papers"
            className="text-sm text-gray-500 underline decoration-gray-300 underline-offset-2 hover:text-gray-800"
          >
            Go to Papers →
          </a>
        </div>
      </div>
    );
  }

  const papers = await fetchRecommendations(savedIds);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Feed</h1>
        <p className="mt-1 text-sm text-gray-400">
          Recommended based on your library.
        </p>
      </div>
      <FeedClient papers={papers} />
    </div>
  );
}
