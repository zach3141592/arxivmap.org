interface Paper {
  arxiv_id: string;
  title: string | null;
  authors: string | null;
  created_at: string | null;
}

interface StarredPapersProps {
  papers: Paper[];
  isOwn: boolean;
}

export function StarredPapers({ papers, isOwn }: StarredPapersProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-gray-900">
        Starred papers
      </h2>

      {papers.length === 0 ? (
        <p className="text-sm italic text-gray-300">
          {isOwn
            ? "No starred papers yet. Star a paper to highlight it here."
            : "No starred papers yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {papers.map((p) => (
            <li key={p.arxiv_id}>
              <a
                href={`/abs/${p.arxiv_id}`}
                className="group flex items-start gap-3 rounded-xl border border-gray-100 px-4 py-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="#f59e0b"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-1 shrink-0"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800 group-hover:text-gray-900">
                    {p.title || p.arxiv_id}
                  </p>
                  {p.authors && (
                    <p className="truncate text-xs text-gray-400">{p.authors}</p>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
