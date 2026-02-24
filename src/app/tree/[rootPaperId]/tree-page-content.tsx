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
      <header className="flex items-center gap-4 border-b border-gray-100 px-6 py-3">
        <a
          href="/"
          className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-800"
        >
          <img src="/arxivmap.png" alt="" className="h-5 w-5" />
          Arxiv Map
        </a>
        <h1 className="flex-1 truncate text-base font-semibold tracking-tight">{rootTitle}</h1>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            chatOpen
              ? "bg-gray-900 text-white"
              : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800"
          }`}
        >
          Chat
        </button>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1">
          <TreeVisualization tree={tree} />
        </div>

        {chatOpen && (
          <aside className="h-full w-[400px] shrink-0 border-l border-gray-100 bg-white">
            <ChatPanel abstract={chatContext} />
          </aside>
        )}
      </div>
    </div>
  );
}
