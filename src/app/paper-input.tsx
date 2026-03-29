"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PaperInput({ compact }: { compact?: boolean }) {
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

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="arXiv ID or URL"
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs outline-none transition-all placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-100"
        />
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-black active:scale-[0.97]"
        >
          Go
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="arXiv ID or URL (e.g. 2301.07041)"
        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-100"
      />
      <button
        type="submit"
        className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-black active:scale-[0.97]"
      >
        Go
      </button>
    </form>
  );
}
