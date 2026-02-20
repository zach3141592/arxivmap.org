"use client";

import { useState } from "react";
import { ChatPanel } from "./chat-panel";
import { ResearchTreePanel } from "./research-tree-panel";

type Tab = "chat" | "tree";

export function RightPanel({
  paperId,
  title,
  abstract,
  authors,
}: {
  paperId: string;
  title: string;
  abstract: string;
  authors: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "chat"
              ? "border-b-2 border-black text-black"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("tree")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "tree"
              ? "border-b-2 border-black text-black"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Research Tree
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" ? (
          <ChatPanel abstract={abstract} />
        ) : (
          <ResearchTreePanel
            paperId={paperId}
            title={title}
            abstract={abstract}
            authors={authors}
          />
        )}
      </div>
    </div>
  );
}
