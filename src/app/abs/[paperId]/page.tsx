import { redirect } from "next/navigation";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchArxivPaper } from "@/lib/arxiv";
import { SummarySection } from "./summary-section";
import { RightPanel } from "./right-panel";

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

  // Check cache for existing summary — scoped to this user
  const { data: cached } = await serviceClient
    .from("paper_summaries")
    .select("title, authors, abstract, summary")
    .eq("arxiv_id", paperId)
    .eq("user_id", authData.user.id)
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
    <div className="flex min-h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-12 lg:px-12">
        <article className="mx-auto w-full max-w-2xl">
          <a
            href="/"
            className="mb-8 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-black"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Home
          </a>

          <h1 className="text-2xl font-bold leading-tight tracking-tight">{title}</h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-500">{authors}</p>

          <a
            href={`https://arxiv.org/abs/${paperId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-black"
          >
            arxiv.org/{paperId}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>

          <section className="mt-10">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Abstract</h2>
            <p className="mt-3 leading-relaxed text-gray-700">{abstract}</p>
          </section>

          <SummarySection paperId={paperId} initialSummary={initialSummary} />
        </article>
      </div>

      <aside className="sticky top-0 hidden h-screen w-[400px] shrink-0 border-l border-gray-200 lg:block">
        <RightPanel paperId={paperId} title={title} abstract={abstract} authors={authors} />
      </aside>
    </div>
  );
}
