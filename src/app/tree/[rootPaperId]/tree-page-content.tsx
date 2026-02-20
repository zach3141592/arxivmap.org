"use client";

import { TreeVisualization } from "@/components/tree-visualization";
import type { ResearchTree } from "@/lib/research-tree";

export function TreePageContent({
  rootTitle,
  tree,
}: {
  rootTitle: string;
  tree: ResearchTree;
}) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-4 border-b border-gray-200 px-6 py-4">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-black"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </a>
        <h1 className="text-lg font-bold tracking-tight">{rootTitle}</h1>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <TreeVisualization tree={tree} />
      </main>
    </div>
  );
}
