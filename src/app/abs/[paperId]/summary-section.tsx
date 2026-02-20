"use client";

import { useActionState } from "react";
import { summarizePaperAction, type SummarizeResult } from "./actions";

function RenderedSummary({ text }: { text: string }) {
  const hasHeadings = /^## /m.test(text);

  if (!hasHeadings) {
    return (
      <div className="space-y-4 leading-relaxed text-gray-700">
        {text.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    );
  }

  // Parse into sections: split on ## headings
  const sections: { heading: string; bullets: string[] }[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      sections.push({ heading: trimmed.slice(3), bullets: [] });
    } else if (trimmed.startsWith("- ") && sections.length > 0) {
      sections[sections.length - 1].bullets.push(trimmed.slice(2));
    }
  }

  const icons: Record<string, React.ReactNode> = {
    "Key Contributions": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    ),
    Methodology: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ),
    Findings: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    ),
  };

  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-100 bg-gray-50/50 px-5 py-4"
        >
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            {icons[section.heading] ?? null}
            {section.heading}
          </h3>
          <ul className="mt-3 space-y-2">
            {section.bullets.map((bullet, j) => (
              <li
                key={j}
                className="flex gap-2.5 text-sm leading-relaxed text-gray-700"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function SummarySection({
  paperId,
  initialSummary,
}: {
  paperId: string;
  initialSummary: string | null;
}) {
  const initialState: SummarizeResult = initialSummary
    ? { status: "success", summary: initialSummary }
    : { status: "idle" };

  const [state, formAction, isPending] = useActionState(
    summarizePaperAction,
    initialState
  );

  if (state.status === "success") {
    return (
      <section className="mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
          AI Summary
        </h2>
        <div className="mt-4">
          <RenderedSummary text={state.summary} />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      {state.status === "error" && (
        <p className="mb-4 text-sm text-red-600">{state.message}</p>
      )}
      <form action={formAction}>
        <input type="hidden" name="paperId" value={paperId} />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Summarizing...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M5 10l7-7 7 7"/></svg>
              Summarize Paper
            </>
          )}
        </button>
      </form>
    </section>
  );
}
