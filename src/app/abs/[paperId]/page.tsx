import { redirect } from "next/navigation";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchArxivPaper } from "@/lib/arxiv";
import { summarizePaper } from "@/lib/summarize";

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

  // Service client bypasses RLS for cache reads/writes
  const serviceClient = createServiceClient();

  // Check cache
  const { data: cached } = await serviceClient
    .from("paper_summaries")
    .select("*")
    .eq("arxiv_id", paperId)
    .single();

  if (cached) {
    return (
      <PaperView
        paperId={paperId}
        title={cached.title}
        authors={cached.authors}
        abstract={cached.abstract}
        summary={cached.summary}
      />
    );
  }

  // Fetch from arxiv
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

  // Summarize with Claude (fall back to raw abstract on failure)
  let summary: string;
  try {
    summary = await summarizePaper(paper.abstract);
  } catch {
    summary = paper.abstract;
  }

  // Cache in Supabase
  await serviceClient.from("paper_summaries").upsert({
    arxiv_id: paperId,
    title: paper.title,
    authors: paper.authors,
    abstract: paper.abstract,
    summary,
  });

  return (
    <PaperView
      paperId={paperId}
      title={paper.title}
      authors={paper.authors}
      abstract={paper.abstract}
      summary={summary}
    />
  );
}

function PaperView({
  paperId,
  title,
  authors,
  abstract,
  summary,
}: {
  paperId: string;
  title: string;
  authors: string;
  abstract: string;
  summary: string;
}) {
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
          <h2 className="text-lg font-bold">AI Summary</h2>
          <div className="mt-2 space-y-4 leading-relaxed">
            {summary.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>

        <details className="mt-8">
          <summary className="cursor-pointer text-lg font-bold">
            Original Abstract
          </summary>
          <p className="mt-2 leading-relaxed">{abstract}</p>
        </details>
      </article>
    </div>
  );
}
