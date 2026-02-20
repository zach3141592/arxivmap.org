"use client";

import { useActionState } from "react";
import { summarizePaperAction, type SummarizeResult } from "./actions";

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
      <section className="mt-8">
        <h2 className="text-lg font-bold">AI Summary</h2>
        <div className="mt-2 space-y-4 leading-relaxed">
          {state.summary.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      {state.status === "error" && (
        <p className="mb-4 text-sm text-red-600">{state.message}</p>
      )}
      <form action={formAction}>
        <input type="hidden" name="paperId" value={paperId} />
        <button
          type="submit"
          disabled={isPending}
          className="border border-black px-6 py-2 text-sm font-medium transition-colors hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
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
            </span>
          ) : (
            "Summarize Paper"
          )}
        </button>
      </form>
    </section>
  );
}
