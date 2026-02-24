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
  onRename,
  onEdit,
  onDownload,
  onDelete,
}: {
  onRename: () => void;
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
        className="rounded-lg px-1.5 py-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500"
      >
        <span className="text-sm leading-none tracking-widest">&middot;&middot;&middot;</span>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-10 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg shadow-gray-100/50">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onRename();
            }}
            className="w-full px-3.5 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Rename
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            className="w-full px-3.5 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onDownload();
            }}
            className="w-full px-3.5 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Download
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            className="w-full px-3.5 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
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
        prev.map((p) =>
          p.arxiv_id === arxivId ? { ...p, title: newTitle } : p
        )
      );
    }
    setRenamingId(null);
  }

  async function renameTree(arxivId: string, newTitle: string) {
    const res = await fetch("/api/research-tree", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: arxivId, root_title: newTitle }),
    });
    if (res.ok) {
      setTreeList((prev) =>
        prev.map((t) =>
          t.arxiv_id === arxivId ? { ...t, root_title: newTitle } : t
        )
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

  async function deleteTree(arxivId: string) {
    const res = await fetch(`/api/research-tree?id=${arxivId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTreeList((prev) => prev.filter((t) => t.arxiv_id !== arxivId));
    }
  }

  return (
    <section className="mt-14">
      <div className="flex gap-1 border-b border-gray-100">
        <button
          onClick={() => setActiveTab("papers")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "papers"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Papers
        </button>
        <button
          onClick={() => setActiveTab("trees")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "trees"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Research Trees
        </button>
      </div>

      {activeTab === "papers" ? (
        paperList.length > 0 ? (
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
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                      />
                    </form>
                  ) : (
                    <a
                      href={`/abs/${paper.arxiv_id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-medium text-gray-800">
                        {paper.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
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
                  )}
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <ThreeDotMenu
                      onRename={() => {
                        setRenameValue(paper.title);
                        setRenamingId(paper.arxiv_id);
                      }}
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
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-center text-sm text-gray-400">
            No summaries yet. Look up a paper to get started.
          </p>
        )
      ) : treeList.length > 0 ? (
        <ul className="mt-2">
          {treeList.map((tree) => (
            <li key={tree.arxiv_id}>
              <div className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50">
                {renamingId === tree.arxiv_id ? (
                  <form
                    className="min-w-0 flex-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      renameTree(tree.arxiv_id, renameValue);
                    }}
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => setRenamingId(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                    />
                  </form>
                ) : (
                  <a
                    href={`/tree/${tree.arxiv_id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-medium text-gray-800">
                      {tree.root_title || tree.arxiv_id}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
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
                )}
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <ThreeDotMenu
                    onRename={() => {
                      setRenameValue(tree.root_title || tree.arxiv_id);
                      setRenamingId(tree.arxiv_id);
                    }}
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
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-center text-sm text-gray-400">
          No research trees yet. Generate one from a paper page.
        </p>
      )}
    </section>
  );
}
