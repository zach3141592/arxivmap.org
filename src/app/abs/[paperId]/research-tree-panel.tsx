"use client";

import { useState, useEffect, useRef } from "react";
import { TreeVisualization } from "@/components/tree-visualization";
import type { ResearchTree } from "@/lib/research-tree";

type Status = "checking" | "idle" | "loading" | "success" | "error";

interface ProgressStep {
  label: string;
  progress: number;
  done: boolean;
}

interface MembershipTree {
  arxiv_id: string;
  root_title: string;
  tree_data: ResearchTree;
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
  const [status, setStatus] = useState<Status>("checking");
  const [tree, setTree] = useState<ResearchTree | null>(null);
  const [memberTrees, setMemberTrees] = useState<MembershipTree[]>([]);
  const [selectedTreeIdx, setSelectedTreeIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const checkedRef = useRef(false);

  // Check membership on mount
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    async function checkMembership() {
      try {
        const res = await fetch(`/api/research-tree/membership?paperId=${paperId}`);
        if (!res.ok) {
          setStatus("idle");
          return;
        }
        const data = await res.json();
        if (data.trees && data.trees.length > 0) {
          setMemberTrees(data.trees);
          setTree(data.trees[0].tree_data);
          setStatus("success");
        } else {
          setStatus("idle");
        }
      } catch {
        setStatus("idle");
      }
    }

    checkMembership();
  }, [paperId]);

  async function generateTree() {
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
            eventType = "";
          } else {
            buffer += line;
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  function handleTreeSelect(idx: number) {
    setSelectedTreeIdx(idx);
    setTree(memberTrees[idx].tree_data);
  }

  // Checking membership
  if (status === "checking") {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50/50">
        <svg
          className="h-5 w-5 animate-spin text-gray-400"
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
      </div>
    );
  }

  // No existing tree — show generate button
  if (status === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-50/50 px-6">
        <p className="mb-4 text-sm text-gray-500">
          No research tree found for this paper.
        </p>
        <button
          onClick={generateTree}
          className="rounded-lg border border-black px-5 py-2 text-sm font-medium transition-colors hover:bg-black hover:text-white"
        >
          Generate Research Tree
        </button>
      </div>
    );
  }

  // Loading / generating
  if (status === "loading") {
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
          onClick={generateTree}
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
      {memberTrees.length > 1 && (
        <div className="border-b border-gray-200 px-4 py-2">
          <select
            value={selectedTreeIdx}
            onChange={(e) => handleTreeSelect(Number(e.target.value))}
            className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
          >
            {memberTrees.map((t, i) => (
              <option key={t.arxiv_id} value={i}>
                {t.root_title || t.arxiv_id}
              </option>
            ))}
          </select>
        </div>
      )}
      <TreeVisualization tree={tree} highlightPaperId={paperId} />
    </div>
  );
}
