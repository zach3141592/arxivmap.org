import { unstable_cache } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchLatestArxivPapers, type ArxivSearchResult } from "@/lib/arxiv";
import { FeedClient, type FeedPaper } from "./feed-client";

async function fetchRecommendations(arxivIds: string[]): Promise<FeedPaper[]> {
  if (arxivIds.length === 0) return [];

  // Semantic Scholar multi-paper recommendations — accepts arXiv IDs
  const positivePaperIds = arxivIds.slice(0, 25).map((id) => `arXiv:${id}`);

  try {
    const res = await fetch(
      "https://api.semanticscholar.org/recommendations/v1/papers/?fields=title,authors,abstract,year,publicationDate,externalIds&limit=100",
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
          month: p.publicationDate ? new Date(p.publicationDate as string).toLocaleString("en-US", { month: "short" }) : null,
        };
      });
  } catch {
    return [];
  }
}

function scorePaper(p: ArxivSearchResult, starCounts: Record<string, number>): number {
  const stars = starCounts[p.id] ?? 0;
  const daysSince = p.published
    ? (Date.now() - new Date(p.published).getTime()) / (1000 * 60 * 60 * 24)
    : 30;
  // Recency decays to 0 over 14 days; each star adds 5 points
  const recencyScore = Math.max(0, 1 - daysSince / 14);
  return stars * 5 + recencyScore;
}

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const serviceClient = createServiceClient();

  // Run user's saved papers + global star counts in parallel
  const [{ data: savedPapers }, { data: starredRows }] = await Promise.all([
    serviceClient
      .from("paper_summaries")
      .select("arxiv_id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50),
    serviceClient
      .from("paper_summaries")
      .select("arxiv_id")
      .eq("starred", true),
  ]);

  const savedIds = (savedPapers ?? []).map((p) => p.arxiv_id);

  const starCounts: Record<string, number> = {};
  for (const row of starredRows ?? []) {
    starCounts[row.arxiv_id] = (starCounts[row.arxiv_id] ?? 0) + 1;
  }

  const getCachedFeed = unstable_cache(
    async () => {
      const [recommendedPapers, recentArxiv] = await Promise.all([
        savedIds.length > 0 ? fetchRecommendations(savedIds) : Promise.resolve([]),
        fetchLatestArxivPapers(["cs.AI", "cs.LG", "cs.CV", "stat.ML"], 100),
      ]);

      const trendingPapers: FeedPaper[] = [...recentArxiv]
        .sort((a, b) => scorePaper(b, starCounts) - scorePaper(a, starCounts))
        .map((p) => ({
          arxiv_id: p.id,
          title: p.title,
          authors: p.authors,
          abstract: p.abstract,
          year: p.published ? new Date(p.published).getFullYear() : null,
          month: p.published ? new Date(p.published).toLocaleString("en-US", { month: "short" }) : null,
        }));

      return { recommendedPapers, trendingPapers };
    },
    [`feed-${user!.id}`],
    { tags: [`feed-${user!.id}`] }
  );

  const { recommendedPapers, trendingPapers } = await getCachedFeed();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Feed</h1>
      </div>
      <FeedClient
        recommendedPapers={recommendedPapers}
        trendingPapers={trendingPapers}
      />
    </div>
  );
}
