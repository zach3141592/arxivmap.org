"use client";

import { useState } from "react";

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

export function HomeTabs({
  papers,
  trees,
}: {
  papers: Paper[];
  trees: Tree[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("papers");

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
        papers.length > 0 ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {papers.map((paper) => (
              <li key={paper.arxiv_id}>
                <a
                  href={`/abs/${paper.arxiv_id}`}
                  className="block py-3 transition-colors hover:bg-gray-50"
                >
                  <p className="text-sm font-medium leading-snug">
                    {paper.title}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {paper.arxiv_id}
                    {paper.created_at && (
                      <> &middot; {new Date(paper.created_at).toLocaleDateString()}</>
                    )}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            No summaries yet. Look up a paper to get started.
          </p>
        )
      ) : trees.length > 0 ? (
        <ul className="mt-4 divide-y divide-gray-100">
          {trees.map((tree) => (
            <li key={tree.arxiv_id}>
              <a
                href={`/tree/${tree.arxiv_id}`}
                className="block py-3 transition-colors hover:bg-gray-50"
              >
                <p className="text-sm font-medium leading-snug">
                  {tree.root_title || tree.arxiv_id}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {tree.node_count != null && (
                    <>{tree.node_count} papers</>
                  )}
                  {tree.created_at && (
                    <> &middot; {new Date(tree.created_at).toLocaleDateString()}</>
                  )}
                </p>
              </a>
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
