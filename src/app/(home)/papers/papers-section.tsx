"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThreeDotMenu } from "../list-utils";

interface Paper {
  arxiv_id: string;
  title: string;
  authors?: string;
  created_at: string | null;
}

function extractArxivId(value: string): string | null {
  // Try as URL first
  try {
    const url = new URL(value);
    if (url.hostname.includes("arxiv.org")) {
      const match = url.pathname.match(/\/(abs|pdf)\/(.+?)(?:\.pdf)?$/);
      if (match) return match[2];
    }
  } catch {
    // not a URL
  }
  // Bare arxiv ID like 2301.07041
  if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(value.trim())) {
    return value.trim();
  }
  return null;
}

export function PapersSection({ papers }: { papers: Paper[] }) {
  const [paperList, setPaperList] = useState(papers);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const router = useRouter();

  const arxivId = extractArxivId(query);
  const filteredPapers = query && !arxivId
    ? paperList.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    : paperList;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (arxivId) {
      router.push(`/abs/${arxivId}`);
    }
  }

  async function renamePaper(arxivId: string, newTitle: string) {
    const res = await fetch("/api/paper", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: arxivId, title: newTitle }),
    });
    if (res.ok) {
      setPaperList((prev) =>
        prev.map((p) => (p.arxiv_id === arxivId ? { ...p, title: newTitle } : p))
      );
    }
    setRenamingId(null);
  }

  async function deletePaper(arxivId: string) {
    const res = await fetch(`/api/paper?id=${arxivId}`, { method: "DELETE" });
    if (res.ok) {
      setPaperList((prev) => prev.filter((p) => p.arxiv_id !== arxivId));
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex w-full gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search papers or enter arXiv URL"
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-100"
        />
        <button
          type="submit"
          disabled={!arxivId}
          className="rounded-xl px-5 py-2.5 text-sm font-medium transition-all disabled:cursor-default disabled:bg-gray-100 disabled:text-gray-300 bg-gray-900 text-white hover:bg-black active:scale-[0.97] disabled:active:scale-100"
        >
          Go
        </button>
      </form>

      {filteredPapers.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-400">
          {query ? "No papers match your search." : "No summaries yet. Look up a paper to get started."}
        </p>
      ) : (
        <ul className="mt-2">
          {filteredPapers.map((paper) => (
            <li key={paper.arxiv_id}>
              <div className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50">
                {renamingId === paper.arxiv_id ? (
                  <form
                    className="min-w-0 flex-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      renamePaper(paper.arxiv_id, renameValue);
                    }}
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => setRenamingId(null)}
                      onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                    />
                  </form>
                ) : (
                  <a href={`/abs/${paper.arxiv_id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{paper.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {paper.arxiv_id}
                      {paper.created_at && (
                        <> &middot; {new Date(paper.created_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </a>
                )}
                <div className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <ThreeDotMenu
                    onRename={() => { setRenameValue(paper.title); setRenamingId(paper.arxiv_id); }}
                    onEdit={() => router.push(`/abs/${paper.arxiv_id}`)}
                    onDelete={() => deletePaper(paper.arxiv_id)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
