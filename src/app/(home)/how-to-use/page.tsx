export default function HowToUsePage() {
  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="text-2xl font-semibold text-gray-900">How to use Arxiv Map</h1>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-800">Look up a paper</h2>
        <p className="mt-2 text-sm text-gray-500">
          Paste an arXiv ID (e.g. <code>2301.07041</code>) or a full arXiv URL into the search bar
          in the header and press Go. You&apos;ll be taken to a summary page for that paper.
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
