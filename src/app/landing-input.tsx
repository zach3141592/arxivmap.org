"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function extractPaperId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("arxiv.org")) {
      const match = url.pathname.match(/\/(abs|pdf)\/(.+?)(?:\.pdf)?$/);
      if (match) return match[2];
    }
  } catch {
    // Not a URL — treat as bare paper ID if it looks like one
  }

  // Accept bare IDs like 2301.07041
  if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function LandingInput() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const paperId = extractPaperId(value);
    if (!paperId) return;
    router.push(`/login?returnTo=/abs/${paperId}`);
  }

  return (
    <div className="mt-10 w-full">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste an arXiv URL or paper ID"
          className="h-14 w-full rounded-2xl border border-gray-200 bg-white px-5 pr-20 text-base outline-none transition-all placeholder:text-gray-300 focus:border-gray-400 focus:shadow-[0_0_0_4px_rgba(0,0,0,0.03)]"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-black active:scale-[0.97]"
        >
          Go
        </button>
      </form>
    </div>
  );
}
