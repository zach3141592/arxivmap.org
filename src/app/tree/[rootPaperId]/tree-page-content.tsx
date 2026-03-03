"use client";

import { useState, useRef, useEffect } from "react";
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
  const [chatWidth, setChatWidth] = useState(400);
  const chatDragRef = useRef(false);
  const chatDragStartX = useRef(0);
  const chatDragStartW = useRef(400);
  const chatContext = buildTreeContext(tree, rootTitle);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!chatDragRef.current) return;
      const newWidth = Math.min(700, Math.max(280, chatDragStartW.current + (chatDragStartX.current - e.clientX)));
      setChatWidth(newWidth);
    };
    const onPointerUp = () => {
      chatDragRef.current = false;
    };
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center gap-4 border-b border-gray-100 px-6 py-3">
        <a
          href="/"
          className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-800"
        >
          &larr;
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
          <aside className="absolute right-0 top-0 z-20 h-full shadow-lg bg-white" style={{ width: chatWidth }}>
            <div
              className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-gray-300 active:bg-gray-400 transition-colors"
              onPointerDown={(e) => {
                e.preventDefault();
                chatDragRef.current = true;
                chatDragStartX.current = e.clientX;
                chatDragStartW.current = chatWidth;
              }}
            />
            <div className="h-full border-l border-gray-100">
              <ChatPanel abstract={chatContext} contextId={`tree:${tree.root}`} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
