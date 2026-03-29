"use client";

import { useState } from "react";
import { useActionState } from "react";
import { summarizePaperAction, type SummarizeResult } from "./actions";

/** Render inline bold (**text**) within a string */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-gray-800">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function RenderedSummary({ text }: { text: string }) {
  const hasHeadings = /^## /m.test(text);

  if (!hasHeadings) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5">
        <div className="space-y-4 text-[15px] leading-[1.75] text-gray-600">
          {text.split("\n\n").map((paragraph, i) => (
            <p key={i}>{renderInline(paragraph)}</p>
          ))}
        </div>
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
      const content = trimmed.replace(/^(?:[-*]\s+|\d+\.\s+)/, "");
      sections[sections.length - 1].bullets.push(content);
    }
  }

  // Separate TL;DR from the rest
  const tldr = sections.find(
    (s) => s.heading.toLowerCase().replace(/[^a-z]/g, "") === "tldr"
  );
  const rest = sections.filter((s) => s !== tldr);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5">
      {tldr && tldr.bullets.length > 0 && (
        <p className="text-[15px] font-medium leading-relaxed text-gray-700">
          {renderInline(tldr.bullets[0])}
        </p>
      )}

      {rest.map((section, i) => (
        <div key={i} className="mt-5 border-t border-gray-100 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {section.heading}
          </h3>
          <ul className="mt-3 space-y-2.5">
            {section.bullets.map((bullet, j) => (
              <li
                key={j}
                className="flex gap-3 text-[14px] leading-relaxed text-gray-600"
              >
                <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-gray-300" />
                <span>{renderInline(bullet)}</span>
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
  abstract,
}: {
  paperId: string;
  initialSummary: string | null;
  abstract: string;
}) {
  const initialState: SummarizeResult = initialSummary
    ? { status: "success", summary: initialSummary }
    : { status: "idle" };

  const [state, formAction, isPending] = useActionState(
    summarizePaperAction,
    initialState
  );

  const [activeTab, setActiveTab] = useState<"abstract" | "summary">(
    initialSummary ? "summary" : "abstract"
  );

  return (
    <section className="mt-10">
      {/* Tab row */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab("abstract")}
          className={`px-1 pb-2.5 mr-6 text-sm transition-colors ${
            activeTab === "abstract"
              ? "border-b-2 border-gray-900 font-medium text-gray-900"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Abstract
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-1 pb-2.5 text-sm transition-colors ${
            activeTab === "summary"
              ? "border-b-2 border-gray-900 font-medium text-gray-900"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          AI Summary
        </button>
      </div>

      <div className="mt-5">
        {activeTab === "abstract" && (
          <p className="text-[15px] leading-[1.75] text-gray-600">{abstract}</p>
        )}

        {activeTab === "summary" && state.status === "success" && (
          <RenderedSummary text={state.summary} />
        )}

        {activeTab === "summary" && state.status !== "success" && (
          <>
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
          </>
        )}
      </div>
    </section>
  );
}
