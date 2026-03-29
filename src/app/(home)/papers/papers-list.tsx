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

export function PapersList({ papers }: { papers: Paper[] }) {
  const [paperList, setPaperList] = useState(papers);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const router = useRouter();

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

  if (paperList.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-gray-400">
        No summaries yet. Look up a paper to get started.
      </p>
    );
  }

  return (
    <ul className="mt-2">
      {paperList.map((paper) => (
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
  );
}
