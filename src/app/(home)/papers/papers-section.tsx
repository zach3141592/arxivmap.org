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

  async function downloadPaperAsPdf(arxivId: string, fallbackTitle: string) {
    const res = await fetch(`/api/paper?id=${arxivId}`);
    const data = res.ok ? await res.json() : { title: fallbackTitle, authors: "", abstract: "", summary: "" };

    const escape = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const formatSummary = (s: string) =>
      escape(s)
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/^- (.+)$/gm, "<li>$1</li>")
        .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
        .replace(/\n\n/g, "<br/><br/>");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${escape(data.title)}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 680px; margin: 48px auto; padding: 0 24px; color: #111; line-height: 1.6; }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
        .authors { color: #555; font-size: 14px; margin-bottom: 4px; }
        .meta { color: #999; font-size: 12px; margin-bottom: 28px; }
        h2 { font-size: 15px; font-weight: 600; margin-top: 24px; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .abstract { font-size: 13px; color: #444; border-left: 3px solid #ddd; padding-left: 14px; margin: 0; }
        .summary { font-size: 14px; }
        ul { padding-left: 20px; margin: 6px 0; }
        li { margin-bottom: 4px; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>
      <h1>${escape(data.title)}</h1>
      <div class="authors">${escape(data.authors || "")}</div>
      <div class="meta">arXiv: ${arxivId} &nbsp;·&nbsp; arxivmap.org/abs/${arxivId}</div>
      ${data.abstract ? `<h2>Abstract</h2><p class="abstract">${escape(data.abstract)}</p>` : ""}
      ${data.summary ? `<h2>AI Summary</h2><div class="summary">${formatSummary(data.summary)}</div>` : ""}
    </body></html>`);
    win.document.close();
    win.focus();
    win.onload = () => { win.print(); win.onafterprint = () => win.close(); };
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
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <ThreeDotMenu
                    onRename={() => { setRenameValue(paper.title); setRenamingId(paper.arxiv_id); }}
                    onEdit={() => router.push(`/abs/${paper.arxiv_id}`)}
                    onDownload={() => downloadPaperAsPdf(paper.arxiv_id, paper.title)}
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
