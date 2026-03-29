export default function HowToUsePage() {
  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="text-2xl font-semibold text-gray-900">How to use Arxiv Map</h1>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-800">The fastest way to open any paper</h2>
        <p className="mt-2 text-sm text-gray-500">
          When you&apos;re on any arXiv paper, just add <code className="text-gray-700">map</code> after <code className="text-gray-700">arxiv</code> in the URL:
        </p>
        <div className="mt-3 space-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-gray-400">Before</span>
            <code className="text-gray-500">arxiv.org/abs/2601.14242</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-gray-400">After</span>
            <code className="text-gray-800">arxiv<span className="text-red-500">map</span>.org/abs/2601.14242</code>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          That&apos;s it — you&apos;ll land directly on the Arxiv Map summary for that paper.
          Inspired by{" "}
          <a
            href="https://www.arxivisual.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-500"
          >
            arxivisual.org
          </a>
          .
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-800">Look up a paper</h2>
        <p className="mt-2 text-sm text-gray-500">
          Paste an arXiv ID (e.g. <code>2301.07041</code>) or a full arXiv URL into the search bar
          on the Papers page and press Go. You&apos;ll be taken to a summary page for that paper.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-800">Papers</h2>
        <p className="mt-2 text-sm text-gray-500">
          Every paper you look up is saved here. Click a paper to revisit its summary, or use the
          menu to rename, download, or delete it.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-800">Research Trees</h2>
        <p className="mt-2 text-sm text-gray-500">
          From any paper page, generate a research tree to explore related and cited works.
          Trees are saved here for future reference.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-800">My Map</h2>
        <p className="mt-2 text-sm text-gray-500">
          An AI-generated visual map of all your saved papers, clustered by topic.
          The map regenerates automatically when your paper list changes.
        </p>
      </section>
    </div>
  );
}
