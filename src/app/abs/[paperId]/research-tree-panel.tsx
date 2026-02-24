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
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-300">Loading...</p>
      </div>
    );
  }

  // No existing tree — show generate button
  if (status === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <p className="text-sm text-gray-400">
          No research tree found for this paper.
        </p>
        <button
          onClick={generateTree}
          className="mt-4 rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-black active:scale-[0.98]"
        >
          Generate Research Tree
        </button>
      </div>
    );
  }

  // Loading / generating
  if (status === "loading") {
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : null;
    const progressPercent = currentStep ? currentStep.progress : 0;

    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-[260px]">
          <p className="mb-4 text-center text-sm font-medium text-gray-400">
            {currentStep ? currentStep.label : "Building research tree..."}
          </p>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gray-900 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={generateTree}
          className="mt-4 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-gray-400 hover:text-gray-900"
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
    <div className="h-full overflow-auto">
      {memberTrees.length > 1 && (
        <div className="border-b border-gray-100 px-4 py-2">
          <select
            value={selectedTreeIdx}
            onChange={(e) => handleTreeSelect(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-gray-400"
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
