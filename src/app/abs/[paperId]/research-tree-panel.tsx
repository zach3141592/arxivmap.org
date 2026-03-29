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

  const darkBase = { backgroundColor: "#0c0a06" };
  const goldColor = "#c9a84c";
  const dimColor = "#6b5c3e";

  // Checking membership
  if (status === "checking") {
    return (
      <div className="flex h-full items-center justify-center" style={darkBase}>
        <p className="text-sm" style={{ color: dimColor }}>Loading...</p>
      </div>
    );
  }

  // No existing tree — show generate button
  if (status === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6" style={darkBase}>
        <p className="text-sm text-center" style={{ color: dimColor }}>
          No research tree for this paper yet.
        </p>
        <button
          onClick={generateTree}
          className="mt-4 rounded-md px-5 py-2 text-sm font-medium transition-opacity hover:opacity-80 active:scale-[0.98]"
          style={{
            backgroundColor: "#1a1408",
            border: `1px solid rgba(201,168,76,0.4)`,
            color: goldColor,
          }}
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
      <div className="flex h-full flex-col items-center justify-center px-6" style={darkBase}>
        <div className="w-full max-w-[260px]">
          <p className="mb-4 text-center text-sm font-medium" style={{ color: dimColor }}>
            {currentStep ? currentStep.label : "Building research tree..."}
          </p>
          <div className="h-px w-full overflow-hidden" style={{ backgroundColor: "#1f1808" }}>
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%`, backgroundColor: goldColor }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6" style={darkBase}>
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={generateTree}
          className="mt-4 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "#1a1408",
            border: `1px solid rgba(201,168,76,0.3)`,
            color: goldColor,
          }}
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
    <div className="h-full overflow-auto" style={darkBase}>
      {memberTrees.length > 1 && (
        <div className="px-4 py-2" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
          <select
            value={selectedTreeIdx}
            onChange={(e) => handleTreeSelect(Number(e.target.value))}
            className="w-full rounded-md px-2 py-1.5 text-sm outline-none"
            style={{
              backgroundColor: "#1a1408",
              border: "1px solid rgba(201,168,76,0.3)",
              color: "#e8d5a3",
            }}
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
