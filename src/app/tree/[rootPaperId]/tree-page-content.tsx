"use client";

import { TreeVisualization } from "@/components/tree-visualization";
import { ChatPanel } from "@/app/abs/[paperId]/chat-panel";
import type { ResearchTree } from "@/lib/research-tree";

function buildTreeContext(tree: ResearchTree, rootTitle: string): string {
  const root = tree.nodes.find((n) => n.id === tree.root);
  const others = tree.nodes.filter((n) => n.id !== tree.root);

  let context = `Research tree rooted at: "${rootTitle}"`;
  if (root?.abstract) {
    context += `\n\nRoot paper abstract:\n${root.abstract}`;
  }
  if (others.length > 0) {
    context += "\n\nRelated papers in tree:";
    for (const n of others) {
      context += `\n- "${n.title}" (${n.year}, ${n.relationship}): ${n.relevance}`;
    }
  }
  return context;
}

export function TreePageContent({
  rootTitle,
  tree,
}: {
  rootTitle: string;
  tree: ResearchTree;
}) {
  const chatContext = buildTreeContext(tree, rootTitle);

  return (
    <div className="flex min-h-screen flex-col">
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

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-5xl">
            <TreeVisualization tree={tree} />
          </div>
        </main>

        <aside className="hidden h-[calc(100vh-57px)] w-[400px] shrink-0 border-l border-gray-200 lg:block">
          <ChatPanel abstract={chatContext} />
        </aside>
      </div>
    </div>
  );
}
