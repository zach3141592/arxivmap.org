"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  summarizePaperAction,
  generatePrerequisitesAction,
  generateFurtherReadingAction,
  type SummarizeResult,
  type PrerequisitesResult,
  type FurtherReadingResult,
  type FurtherReadingPaper,
} from "./actions";
import type { Prerequisite } from "@/lib/prerequisites";

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
              <li key={j} className="flex gap-3 text-[14px] leading-relaxed text-gray-600">
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

const LEVEL_STYLES: Record<Prerequisite["level"], { bg: string; text: string; label: string }> = {
  basic:        { bg: "#f0fdf4", text: "#166534", label: "Basic" },
  intermediate: { bg: "#eff6ff", text: "#1e40af", label: "Intermediate" },
  advanced:     { bg: "#faf5ff", text: "#6b21a8", label: "Advanced" },
};

function PrerequisiteCard({ prereq }: { prereq: Prerequisite }) {
  const style = LEVEL_STYLES[prereq.level] ?? LEVEL_STYLES.intermediate;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[14px] font-semibold text-gray-800">{prereq.name}</span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: style.bg, color: style.text }}
        >
          {style.label}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">{prereq.description}</p>
    </div>
  );
}

export function SummarySection({
  paperId,
  initialSummary,
  abstract,
  initialPrerequisites,
  initialFurtherReading,
}: {
  paperId: string;
  initialSummary: string | null;
  abstract: string;
  initialPrerequisites: Prerequisite[] | null;
  initialFurtherReading: FurtherReadingPaper[] | null;
}) {
  const initialSummaryState: SummarizeResult = initialSummary
    ? { status: "success", summary: initialSummary }
    : { status: "idle" };

  const initialPrereqState: PrerequisitesResult = initialPrerequisites
    ? { status: "success", prerequisites: initialPrerequisites }
    : { status: "idle" };

  const initialFurtherReadingState: FurtherReadingResult = initialFurtherReading
    ? { status: "success", papers: initialFurtherReading }
    : { status: "idle" };

  const [summaryState, summaryAction, isSummaryPending] = useActionState(
    summarizePaperAction,
    initialSummaryState
  );

  const [prereqState, prereqAction, isPrereqPending] = useActionState(
    generatePrerequisitesAction,
    initialPrereqState
  );

  const [furtherReadingState, furtherReadingAction, isFurtherReadingPending] = useActionState(
    generateFurtherReadingAction,
    initialFurtherReadingState
  );

  const [activeTab, setActiveTab] = useState<"abstract" | "summary" | "prerequisites" | "further-reading">(
    initialSummary ? "summary" : "abstract"
  );

  return (
    <section className="mt-10 pb-24">
      {/* Tab row */}
      <div className="flex border-b border-gray-100">
        {(["abstract", "summary", "prerequisites", "further-reading"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`mr-6 px-1 pb-2.5 text-sm transition-colors ${
              activeTab === tab
                ? "border-b-2 border-gray-900 font-medium text-gray-900"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab === "abstract" ? "Abstract" : tab === "summary" ? "AI Summary" : tab === "prerequisites" ? "Prerequisites" : "Further Reading"}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {activeTab === "abstract" && (
          <p className="text-[15px] leading-[1.75] text-gray-600">{abstract}</p>
        )}

        {activeTab === "summary" && summaryState.status === "success" && (
          <RenderedSummary text={summaryState.summary} />
        )}

        {activeTab === "summary" && summaryState.status !== "success" && (
          <>
            {summaryState.status === "error" && (
              <p className="mb-4 text-sm text-red-500">{summaryState.message}</p>
            )}
            <form action={summaryAction}>
              <input type="hidden" name="paperId" value={paperId} />
              <button
                type="submit"
                disabled={isSummaryPending}
                className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSummaryPending ? "Summarizing..." : "Summarize Paper"}
              </button>
            </form>
          </>
        )}

        {activeTab === "prerequisites" && prereqState.status === "success" && (
          <div className="space-y-2.5">
            {prereqState.prerequisites.map((prereq, i) => (
              <PrerequisiteCard key={i} prereq={prereq} />
            ))}
          </div>
        )}

        {activeTab === "prerequisites" && prereqState.status !== "success" && (
          <>
            {prereqState.status === "error" && (
              <p className="mb-4 text-sm text-red-500">{prereqState.message}</p>
            )}
            <div className="mb-4 text-sm text-gray-400">
              Generate a list of concepts and background knowledge you&apos;ll need to read this paper.
            </div>
            <form action={prereqAction}>
              <input type="hidden" name="paperId" value={paperId} />
              <button
                type="submit"
                disabled={isPrereqPending}
                className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPrereqPending ? "Analyzing..." : "Show Prerequisites"}
              </button>
            </form>
          </>
        )}

        {activeTab === "further-reading" && furtherReadingState.status === "success" && (
          <div className="space-y-2">
            {furtherReadingState.papers.map((paper) => (
              <a
                key={paper.arxiv_id}
                href={`/abs/${paper.arxiv_id}`}
                className="block rounded-xl border border-gray-100 bg-white px-4 py-3.5 transition-colors hover:border-gray-200 hover:bg-gray-50"
              >
                <p className="text-[14px] font-medium leading-snug text-gray-900">{paper.title}</p>
                <p className="mt-1 text-[12px] text-gray-400">
                  {paper.authors}
                  {paper.year ? <span className="ml-2 text-gray-300">{paper.year}</span> : null}
                </p>
              </a>
            ))}
          </div>
        )}

        {activeTab === "further-reading" && furtherReadingState.status !== "success" && (
          <>
            {furtherReadingState.status === "error" && (
              <p className="mb-4 text-sm text-red-500">{furtherReadingState.message}</p>
            )}
            <div className="mb-4 text-sm text-gray-400">
              Find related papers that build on or complement this work.
            </div>
            <form action={furtherReadingAction}>
              <input type="hidden" name="paperId" value={paperId} />
              <button
                type="submit"
                disabled={isFurtherReadingPending}
                className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFurtherReadingPending ? "Finding papers..." : "Find Related Papers"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
