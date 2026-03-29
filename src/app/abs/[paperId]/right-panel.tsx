"use client";

import { ChatPanel } from "./chat-panel";

export function RightPanel({
  paperId,
}: {
  paperId: string;
  title: string;
  abstract: string;
  authors: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <ChatPanel contextId={`paper:${paperId}`} />
    </div>
  );
}
