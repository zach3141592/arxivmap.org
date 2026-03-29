"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThreeDotMenu, downloadJSON } from "../list-utils";

interface Tree {
  arxiv_id: string;
  root_title: string | null;
  node_count: number | null;
  created_at: string | null;
}

export function TreesList({ trees }: { trees: Tree[] }) {
  const [treeList, setTreeList] = useState(trees);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const router = useRouter();

  async function renameTree(arxivId: string, newTitle: string) {
    const res = await fetch("/api/research-tree", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: arxivId, root_title: newTitle }),
    });
    if (res.ok) {
      setTreeList((prev) =>
        prev.map((t) => (t.arxiv_id === arxivId ? { ...t, root_title: newTitle } : t))
      );
    }
    setRenamingId(null);
  }

  async function deleteTree(arxivId: string) {
    const res = await fetch(`/api/research-tree?id=${arxivId}`, { method: "DELETE" });
    if (res.ok) {
      setTreeList((prev) => prev.filter((t) => t.arxiv_id !== arxivId));
    }
  }

  if (treeList.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-gray-400">
        No research trees yet. Generate one from a paper page.
      </p>
    );
  }

  return (
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
                  onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              </form>
            ) : (
              <a href={`/tree/${tree.arxiv_id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">
                  {tree.root_title || tree.arxiv_id}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {tree.node_count != null && <>{tree.node_count} papers</>}
                  {tree.created_at && (
                    <> &middot; {new Date(tree.created_at).toLocaleDateString()}</>
                  )}
                </p>
              </a>
            )}
            <div className="opacity-0 transition-opacity group-hover:opacity-100">
              <ThreeDotMenu
                onRename={() => { setRenameValue(tree.root_title || tree.arxiv_id); setRenamingId(tree.arxiv_id); }}
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
  );
}
