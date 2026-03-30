"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThreeDotMenu } from "../list-utils";

interface Paper {
  arxiv_id: string;
  title: string;
  authors?: string;
  created_at: string | null;
  starred: boolean;
}

type ImportFormat = "text" | "bibtex" | "sql";

type ImportResult = { added: number; failed: string[]; total: number };

function extractArxivId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname.includes("arxiv.org")) {
      const match = url.pathname.match(/\/(abs|pdf)\/(.+?)(?:\.pdf)?$/);
      if (match) return match[2];
    }
  } catch {
    // not a URL
  }
  if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(value.trim())) {
    return value.trim();
  }
  return null;
}

function parseArxivIds(text: string): string[] {
  const ids = new Set<string>();

  // arxiv.org URLs
  for (const m of text.matchAll(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})(?:v\d+)?/gi)) {
    ids.add(m[1]);
  }

  // BibTeX eprint field: eprint = {2301.07041}
  for (const m of text.matchAll(/eprint\s*=\s*[{"](\d{4}\.\d{4,5})(?:v\d+)?[}"]/gi)) {
    ids.add(m[1]);
  }

  // Any bare arXiv ID pattern not adjacent to other digits
  for (const m of text.matchAll(/(?<!\d)(\d{4}\.\d{4,5})(?:v\d+)?(?!\d)/g)) {
    ids.add(m[1]);
  }

  return [...ids];
}

const FORMAT_PLACEHOLDERS: Record<ImportFormat, string> = {
  text: `Paste arXiv IDs or URLs, one per line:

2301.07041
1706.03762
https://arxiv.org/abs/2005.14165`,
  bibtex: `Paste BibTeX entries:

@article{vaswani2017,
  title   = {Attention Is All You Need},
  author  = {Vaswani, Ashraf and others},
  journal = {arXiv preprint arXiv:1706.03762},
  eprint  = {1706.03762},
  year    = {2017}
}`,
  sql: `Paste SQL with arXiv IDs:

INSERT INTO papers (arxiv_id, title) VALUES
  ('2301.07041', 'Llama: Open and Efficient Foundation Language Models'),
  ('1706.03762', 'Attention Is All You Need');`,
};

export function PapersSection({ papers }: { papers: Paper[] }) {
  const [paperList, setPaperList] = useState(papers);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [starredOnly, setStarredOnly] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<ImportFormat>("text");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const router = useRouter();

  const arxivId = extractArxivId(query);
  const filteredPapers = (() => {
    let list = paperList;
    if (query && !arxivId) list = list.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
    if (starredOnly) list = list.filter((p) => p.starred);
    return list;
  })();

  async function toggleStar(arxivId: string, current: boolean) {
    setPaperList((prev) =>
      prev.map((p) => (p.arxiv_id === arxivId ? { ...p, starred: !current } : p))
    );
    await fetch("/api/paper", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: arxivId, starred: !current }),
    });
  }

  const detectedIds = importText.trim() ? parseArxivIds(importText) : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (arxivId) {
      router.push(`/abs/${arxivId}`);
    }
  }

  function openImport() {
    setImportOpen(true);
    setImportText("");
    setImportResult(null);
  }

  function closeImport() {
    setImportOpen(false);
    setImportText("");
    setImportResult(null);
  }

  async function runImport() {
    if (detectedIds.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/papers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arxiv_ids: detectedIds }),
      });
      const data: ImportResult = await res.json();
      setImportResult(data);
      if (data.added > 0) {
        router.refresh();
      }
    } catch {
      setImportResult({ added: 0, failed: detectedIds, total: detectedIds.length });
    } finally {
      setImporting(false);
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
        <button
          type="button"
          onClick={importOpen ? closeImport : openImport}
          className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-all"
          style={{
            background: importOpen ? "#eff6ff" : "white",
            borderColor: importOpen ? "#bfdbfe" : "#e5e7eb",
            color: importOpen ? "#2563eb" : "#6b7280",
          }}
        >
          Import
        </button>
      </form>

      {paperList.some((p) => p.starred) && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStarredOnly((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition-all"
            style={{
              background: starredOnly ? "#fefce8" : "white",
              borderColor: starredOnly ? "#fde68a" : "#e5e7eb",
              color: starredOnly ? "#92400e" : "#9ca3af",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill={starredOnly ? "#f59e0b" : "none"} stroke={starredOnly ? "#f59e0b" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {starredOnly ? `${filteredPapers.length} starred` : "Starred only"}
          </button>
        </div>
      )}

      {importOpen && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
          {/* Format tabs */}
          <div className="mb-3 flex items-center gap-1">
            {(["text", "bibtex", "sql"] as ImportFormat[]).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => { setImportFormat(fmt); setImportText(""); setImportResult(null); }}
                className="rounded-lg px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  background: importFormat === fmt ? "#f3f4f6" : "transparent",
                  color: importFormat === fmt ? "#111827" : "#9ca3af",
                }}
              >
                {fmt === "text" ? "Plain Text" : fmt === "bibtex" ? "BibTeX" : "SQL"}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setImportResult(null); }}
            placeholder={FORMAT_PLACEHOLDERS[importFormat]}
            rows={6}
            className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-100"
          />

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400">
              {importText.trim()
                ? detectedIds.length > 0
                  ? `${detectedIds.length} arXiv ID${detectedIds.length !== 1 ? "s" : ""} detected`
                  : "No arXiv IDs found"
                : "Paste content above"}
            </span>

            <div className="flex items-center gap-2">
              {importResult && (
                <span className="text-xs" style={{ color: importResult.failed.length > 0 ? "#d97706" : "#059669" }}>
                  {importResult.added > 0
                    ? `${importResult.added} added`
                    : "None added"}
                  {importResult.failed.length > 0 && `, ${importResult.failed.length} failed`}
                </span>
              )}
              <button
                type="button"
                onClick={runImport}
                disabled={detectedIds.length === 0 || importing}
                className="rounded-lg px-4 py-1.5 text-xs font-medium transition-all disabled:cursor-default disabled:bg-gray-100 disabled:text-gray-300 bg-gray-900 text-white hover:bg-black active:scale-[0.97] disabled:active:scale-100"
              >
                {importing
                  ? `Importing${detectedIds.length > 0 ? ` ${detectedIds.length}` : ""}…`
                  : detectedIds.length > 0
                  ? `Import ${detectedIds.length > 50 ? "50 (max)" : detectedIds.length} paper${detectedIds.length !== 1 ? "s" : ""}`
                  : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <button
                  type="button"
                  onClick={() => toggleStar(paper.arxiv_id, paper.starred)}
                  className="shrink-0 rounded p-1 transition-colors hover:bg-gray-100"
                  title={paper.starred ? "Unstar" : "Star"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={paper.starred ? "#f59e0b" : "none"} stroke={paper.starred ? "#f59e0b" : "#d1d5db"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
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
