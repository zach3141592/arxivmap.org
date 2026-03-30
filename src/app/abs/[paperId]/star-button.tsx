"use client";

import { useState } from "react";

export function StarButton({
  paperId,
  initialStarred,
}: {
  paperId: string;
  initialStarred: boolean;
}) {
  const [starred, setStarred] = useState(initialStarred);

  async function toggle() {
    setStarred((v) => !v);
    await fetch("/api/paper", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: paperId, starred: !starred }),
    });
  }

  return (
    <button
      onClick={toggle}
      title={starred ? "Unstar" : "Star this paper"}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors"
      style={{
        borderColor: starred ? "#fde68a" : "#e5e7eb",
        background: starred ? "#fefce8" : "transparent",
        color: starred ? "#92400e" : "#9ca3af",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill={starred ? "#f59e0b" : "none"} stroke={starred ? "#f59e0b" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      {starred ? "Starred" : "Star"}
    </button>
  );
}
