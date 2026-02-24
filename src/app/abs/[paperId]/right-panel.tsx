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
      <div className="flex gap-1 border-b border-gray-100 bg-white px-2 pt-1">
        <button
          onClick={() => setActiveTab("chat")}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "chat"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("tree")}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "tree"
              ? "border-b-2 border-gray-900 text-gray-900"
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
