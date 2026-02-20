import { redirect } from "next/navigation";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchArxivPaper } from "@/lib/arxiv";
import { SummarySection } from "./summary-section";

export default async function PaperPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;

  // Auth check
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    redirect(`/?returnTo=/abs/${paperId}`);
  }

  // Service client bypasses RLS for cache reads
  const serviceClient = createServiceClient();

  // Check cache for existing summary (read-only)
  const { data: cached } = await serviceClient
    .from("paper_summaries")
    .select("title, authors, abstract, summary")
    .eq("arxiv_id", paperId)
    .single();

  // If cached, use cached metadata; otherwise fetch from arxiv
  let title: string;
  let authors: string;
  let abstract: string;
  let initialSummary: string | null = null;

  if (cached) {
    title = cached.title;
    authors = cached.authors;
    abstract = cached.abstract;
    initialSummary = cached.summary;
  } else {
    const paper = await fetchArxivPaper(paperId);
    if (!paper) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold">Paper not found</h1>
            <p className="text-sm text-gray-600">
              Could not find arxiv paper with ID: {paperId}
            </p>
            <a
              href="/"
              className="border border-black px-6 py-2 text-sm font-medium transition-colors hover:bg-black hover:text-white"
            >
              Go home
            </a>
          </div>
        </div>
      );
    }
    title = paper.title;
    authors = paper.authors;
    abstract = paper.abstract;
  }

  return (
    <div className="flex min-h-screen justify-center px-4 py-12">
      <article className="w-full max-w-2xl">
        <a
          href="/"
          className="mb-8 inline-block text-sm font-medium underline"
        >
          &larr; Home
        </a>

        <h1 className="text-2xl font-bold leading-tight">{title}</h1>

        <p className="mt-2 text-sm text-gray-600">{authors}</p>

        <a
          href={`https://arxiv.org/abs/${paperId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm underline"
        >
          View on arxiv
        </a>

        <section className="mt-8">
          <h2 className="text-lg font-bold">Abstract</h2>
          <p className="mt-2 leading-relaxed">{abstract}</p>
        </section>

        <SummarySection paperId={paperId} initialSummary={initialSummary} />
      </article>
    </div>
  );
}
