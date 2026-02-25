import { redirect } from "next/navigation";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchArxivPaper } from "@/lib/arxiv";
import { ScrollContainer } from "@/components/scroll-container";
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
    redirect(`/login?returnTo=/abs/${paperId}`);
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
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-xl font-semibold">Paper not found</h1>
            <p className="text-sm text-gray-400">
              Could not find arxiv paper with ID: {paperId}
            </p>
            <a
              href="/"
              className="mt-2 rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-black"
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

    // Save paper on first visit so it appears in the home page list
    const { error: saveError } = await serviceClient.from("paper_summaries").upsert(
      {
        arxiv_id: paperId,
        user_id: authData.user.id,
        title,
        authors,
        abstract,
        summary: null,
      },
      { onConflict: "arxiv_id,user_id", ignoreDuplicates: true }
    );
    if (saveError) console.error("Failed to save paper on visit:", saveError);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ScrollContainer className="flex-1 overflow-y-auto overscroll-contain px-6 py-10 lg:px-12">
        <article className="mx-auto w-full max-w-2xl">
          <a
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-800"
          >
            &larr;
            <img src="/arxivmap.png" alt="" className="h-5 w-5" />
            Arxiv Map
          </a>

          <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h1>

          <p className="mt-4 text-sm leading-relaxed text-gray-400">{authors}</p>

          <a
            href={`https://arxiv.org/abs/${paperId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
          >
            arxiv.org/{paperId}
          </a>

          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-300">Abstract</h2>
            <p className="mt-4 text-[15px] leading-[1.75] text-gray-600">{abstract}</p>
          </section>

          <SummarySection paperId={paperId} initialSummary={initialSummary} />
        </article>
      </ScrollContainer>

      <aside className="sticky top-0 hidden h-screen w-[420px] shrink-0 border-l border-gray-100 lg:block">
        <RightPanel paperId={paperId} title={title} abstract={abstract} authors={authors} />
      </aside>
    </div>
  );
}
