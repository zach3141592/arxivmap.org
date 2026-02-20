"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Tab = "papers" | "trees";

interface Paper {
  arxiv_id: string;
  title: string;
  created_at: string | null;
}

interface Tree {
  arxiv_id: string;
  root_title: string | null;
  node_count: number | null;
  created_at: string | null;
}

function ThreeDotMenu({
  onEdit,
  onDownload,
  onDelete,
}: {
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            Edit
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onDownload();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function downloadJSON(filename: string, data: Record<string, unknown>) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function HomeTabs({
  papers,
  trees,
}: {
  papers: Paper[];
  trees: Tree[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("papers");
  const [paperList, setPaperList] = useState(papers);
  const [treeList, setTreeList] = useState(trees);
  const router = useRouter();

  async function deletePaper(arxivId: string) {
    const res = await fetch(`/api/paper?id=${arxivId}`, { method: "DELETE" });
    if (res.ok) {
      setPaperList((prev) => prev.filter((p) => p.arxiv_id !== arxivId));
    }
  }

  async function deleteTree(arxivId: string) {
    const res = await fetch(`/api/research-tree?id=${arxivId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTreeList((prev) => prev.filter((t) => t.arxiv_id !== arxivId));
    }
  }

  return (
    <section className="mt-12">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("papers")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "papers"
              ? "border-b-2 border-black text-black"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Papers
        </button>
        <button
          onClick={() => setActiveTab("trees")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "trees"
              ? "border-b-2 border-black text-black"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Research Trees
        </button>
      </div>

      {activeTab === "papers" ? (
        paperList.length > 0 ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {paperList.map((paper) => (
              <li key={paper.arxiv_id}>
                <div className="flex items-center gap-2 py-3 transition-colors hover:bg-gray-50">
                  <a
                    href={`/abs/${paper.arxiv_id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="text-sm font-medium leading-snug">
                      {paper.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {paper.arxiv_id}
                      {paper.created_at && (
                        <>
                          {" "}
                          &middot;{" "}
                          {new Date(paper.created_at).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </a>
                  <ThreeDotMenu
                    onEdit={() => router.push(`/abs/${paper.arxiv_id}`)}
                    onDownload={() =>
                      downloadJSON(`${paper.arxiv_id}.json`, {
                        arxiv_id: paper.arxiv_id,
                        title: paper.title,
                        created_at: paper.created_at,
                      })
                    }
                    onDelete={() => deletePaper(paper.arxiv_id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            No summaries yet. Look up a paper to get started.
          </p>
        )
      ) : treeList.length > 0 ? (
        <ul className="mt-4 divide-y divide-gray-100">
          {treeList.map((tree) => (
            <li key={tree.arxiv_id}>
              <div className="flex items-center gap-2 py-3 transition-colors hover:bg-gray-50">
                <a
                  href={`/tree/${tree.arxiv_id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="text-sm font-medium leading-snug">
                    {tree.root_title || tree.arxiv_id}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {tree.node_count != null && (
                      <>{tree.node_count} papers</>
                    )}
                    {tree.created_at && (
                      <>
                        {" "}
                        &middot;{" "}
                        {new Date(tree.created_at).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </a>
                <ThreeDotMenu
                  onEdit={() => router.push(`/tree/${tree.arxiv_id}`)}
                  onDownload={() =>
                    downloadJSON(`tree-${tree.arxiv_id}.json`, {
                      arxiv_id: tree.arxiv_id,
                      root_title: tree.root_title,
                      node_count: tree.node_count,
                      created_at: tree.created_at,
                    })
                  }
                  onDelete={() => deleteTree(tree.arxiv_id)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-gray-500">
          No research trees yet. Generate one from a paper page.
        </p>
      )}
    </section>
  );
}
