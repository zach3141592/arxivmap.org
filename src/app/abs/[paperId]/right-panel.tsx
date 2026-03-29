"use client";

import { ChatPanel } from "./chat-panel";

export function RightPanel({
  abstract,
  paperId,
}: {
  paperId: string;
  title: string;
  abstract: string;
  authors: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <ChatPanel abstract={abstract} contextId={`paper:${paperId}`} />
    </div>
  );
}
