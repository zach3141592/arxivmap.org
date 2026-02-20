"use client";

import { useState } from "react";
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
  const [chatOpen, setChatOpen] = useState(false);
  const chatContext = buildTreeContext(tree, rootTitle);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center gap-4 border-b border-gray-200 px-6 py-3">
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
        <h1 className="flex-1 text-lg font-bold tracking-tight">{rootTitle}</h1>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            chatOpen
              ? "border-black bg-black text-white"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat
        </button>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1">
          <TreeVisualization tree={tree} />
        </div>

        {chatOpen && (
          <aside className="h-full w-[400px] shrink-0 border-l border-gray-200 bg-white">
            <ChatPanel abstract={chatContext} />
          </aside>
        )}
      </div>
    </div>
  );
}
