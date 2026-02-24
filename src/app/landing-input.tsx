"use client";

import { useState, useRef } from "react";

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
  const formRef = useRef<HTMLFormElement>(null);
  const returnToRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const paperId = extractPaperId(value);
    if (!paperId) return;

    // Set the returnTo value and submit the login form
    if (returnToRef.current) {
      returnToRef.current.value = `/abs/${paperId}`;
    }
    formRef.current?.submit();
  }

  return (
    <div className="mt-8 w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste an arXiv URL or ID"
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-black active:scale-[0.97]"
        >
          Go
        </button>
      </form>
      {/* Hidden form that actually submits to the login endpoint */}
      <form ref={formRef} action="/auth/login" method="POST" className="hidden">
        <input ref={returnToRef} type="hidden" name="returnTo" value="" />
      </form>
    </div>
  );
}
