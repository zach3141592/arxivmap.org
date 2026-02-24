"use client";

import { useActionState } from "react";
import { summarizePaperAction, type SummarizeResult } from "./actions";

function RenderedSummary({ text }: { text: string }) {
  const hasHeadings = /^## /m.test(text);

  if (!hasHeadings) {
    return (
      <div className="space-y-4 text-[15px] leading-[1.75] text-gray-600">
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
    } else if (sections.length > 0 && trimmed.length > 0) {
      // Strip leading bullet markers (-, *, or numbered like "1.")
      const content = trimmed.replace(/^(?:[-*]\s+|\d+\.\s+)/, "");
      sections[sections.length - 1].bullets.push(content);
    }
  }

  return (
    <div className="space-y-4">
      {sections.map((section, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-100 bg-gray-50/60 px-5 py-4"
        >
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {section.heading}
          </h3>
          <ul className="mt-3 space-y-2.5">
            {section.bullets.map((bullet, j) => (
              <li
                key={j}
                className="flex gap-3 text-sm leading-relaxed text-gray-600"
              >
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
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
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-300">
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
        <p className="mb-4 text-sm text-red-500">{state.message}</p>
      )}
      <form action={formAction}>
        <input type="hidden" name="paperId" value={paperId} />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-black active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Summarizing..." : "Summarize Paper"}
        </button>
      </form>
    </section>
  );
}
