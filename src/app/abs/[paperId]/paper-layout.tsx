"use client";

import { useState } from "react";

export function PaperLayout({
  children,
  chatPanel,
}: {
  children: React.ReactNode;
  chatPanel: React.ReactNode;
}) {
  const [tab, setTab] = useState<"paper" | "chat">("paper");

  return (
    <>
      {/* ── Desktop: side-by-side ── */}
      <div className="hidden lg:flex h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        <aside className="sticky top-0 h-screen w-[420px] shrink-0 border-l border-gray-100">
          {chatPanel}
        </aside>
      </div>

      {/* ── Mobile: tab-switched ── */}
      <div className="flex lg:hidden flex-col h-screen overflow-hidden">
        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-gray-100 bg-white">
          <button
            onClick={() => setTab("paper")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "paper"
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-400"
            }`}
          >
            Paper
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "chat"
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-400"
            }`}
          >
            Chat
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-hidden ${tab === "paper" ? "block" : "hidden"}`}>
          <div className="h-full overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
        <div className={`flex-1 overflow-hidden ${tab === "chat" ? "block" : "hidden"}`}>
          {chatPanel}
        </div>
      </div>
    </>
  );
}
