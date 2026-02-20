"use client";

import { useState, useEffect, useRef } from "react";
import { TreeVisualization } from "./tree-visualization";
import type { ResearchTree } from "@/lib/research-tree";

type Status = "idle" | "loading" | "success" | "error";

interface ProgressStep {
  label: string;
  progress: number;
  done: boolean;
}

export function ResearchTreePanel({
  paperId,
  title,
  abstract,
  authors,
}: {
  paperId: string;
  title: string;
  abstract: string;
  authors: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [tree, setTree] = useState<ResearchTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const fetchedRef = useRef(false);

  async function fetchTree() {
    setStatus("loading");
    setError(null);
    setSteps([]);

    try {
      const res = await fetch("/api/research-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId, title, abstract, authors }),
      });

      if (!res.ok) throw new Error("Request failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (eventType === "progress") {
                setSteps((prev) => {
                  const existing = prev.map((s) => ({ ...s, done: true }));
                  return [
                    ...existing,
                    {
                      label: parsed.step,
                      progress: parsed.progress,
                      done: false,
                    },
                  ];
                });
              } else if (eventType === "complete") {
                setTree(parsed as ResearchTree);
                setStatus("success");
              } else if (eventType === "error") {
                throw new Error(parsed.message);
              }
            } catch (e) {
              if (eventType === "error") throw e;
            }
          } else if (line === "") {
            // Empty line separates events, reset
            eventType = "";
          } else {
            // Incomplete line, put back in buffer
            buffer += line;
          }
        }
      }

      // If we never got a complete event, check if tree was set
      if (!tree && status !== "success") {
        setStatus("success");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchTree();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-50/50 px-6">
        <div className="w-full max-w-[280px]">
          <div className="mb-6 text-center">
            <svg
              className="mx-auto h-5 w-5 animate-spin text-gray-400"
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
            <p className="mt-3 text-sm font-medium text-gray-500">
              Building research tree
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {step.done ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-green-500"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4 shrink-0 animate-spin text-gray-400"
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
                )}
                <span
                  className={`text-sm ${step.done ? "text-gray-400" : "text-gray-600"}`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-50/50 px-6">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => {
            fetchedRef.current = false;
            fetchTree();
          }}
          className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!tree) {
    return null;
  }

  return (
    <div className="h-full overflow-auto bg-gray-50/50">
      <TreeVisualization tree={tree} />
    </div>
  );
}
