"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PaperInput() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    // Extract paper ID from full arxiv URLs or use as-is
    let paperId = trimmed;
    try {
      const url = new URL(trimmed);
      if (url.hostname.includes("arxiv.org")) {
        // Handle /abs/XXXX.XXXXX and /pdf/XXXX.XXXXX patterns
        const match = url.pathname.match(/\/(abs|pdf)\/(.+?)(?:\.pdf)?$/);
        if (match) {
          paperId = match[2];
        }
      }
    } catch {
      // Not a URL, use as-is (assumed to be a bare paper ID)
    }

    router.push(`/abs/${paperId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="arXiv ID or URL (e.g. 2301.07041)"
        className="flex-1 border border-black px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
      />
      <button
        type="submit"
        className="border border-black px-6 py-2 text-sm font-medium transition-colors hover:bg-black hover:text-white"
      >
        Go
      </button>
    </form>
  );
}
