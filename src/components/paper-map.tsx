"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";

/* ── Topic classification ── */

interface TopicDef {
  label: string;
  keywords: string[];
  bg: string;       // blob background
  border: string;   // blob border
  accent: string;   // label color
}

const TOPICS: TopicDef[] = [
  { label: "Reinforcement Learning", keywords: ["reinforcement", "reward", "policy"], bg: "#dbeafe", border: "#93c5fd", accent: "#2563eb" },
  { label: "Reasoning", keywords: ["reasoning", "chain-of-thought", "thought", "logic"], bg: "#fef3c7", border: "#fcd34d", accent: "#b45309" },
  { label: "Interpretability", keywords: ["interpret", "explain", "mechanistic", "spectral"], bg: "#d1fae5", border: "#6ee7b7", accent: "#059669" },
  { label: "Language Models", keywords: ["language model", "llm", "transformer", "diffusion"], bg: "#ede9fe", border: "#c4b5fd", accent: "#7c3aed" },
  { label: "Agents", keywords: ["agent", "autonomous", "tool", "mcp"], bg: "#fce7f3", border: "#f9a8d4", accent: "#db2777" },
  { label: "Safety", keywords: ["safety", "alignment", "adversarial", "robustness"], bg: "#fee2e2", border: "#fca5a5", accent: "#dc2626" },
];

const OTHER_TOPIC: TopicDef = { label: "Other", keywords: [], bg: "#f3f4f6", border: "#d1d5db", accent: "#6b7280" };

function classifyPaper(title: string): TopicDef {
  const lower = title.toLowerCase();
  for (const topic of TOPICS) {
    if (topic.keywords.some((kw) => lower.includes(kw))) return topic;
  }
  return OTHER_TOPIC;
}

/* ── Types ── */

interface Paper {
  arxiv_id: string;
  title: string;
  authors?: string;
}

/* ── Layout constants ── */

const CARD_W = 250;
const CARD_H = 64;
const CARD_GAP = 8;
const BLOB_PAD_X = 16;
const BLOB_PAD_Y = 12;
const BLOB_LABEL_H = 32;
const BLOB_COLS = 2;
const BLOB_GAP = 32;

/* ── Helpers ── */

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "\u2026";
}

function firstAuthor(authors?: string): string {
  if (!authors) return "";
  const first = authors.split(",")[0].trim();
  return authors.includes(",") ? `${first} et al.` : first;
}

/* ── Blob layout ── */

interface BlobLayout {
  topic: TopicDef;
  papers: Paper[];
  x: number;
  y: number;
  w: number;
  h: number;
}

function layoutBlobs(papers: Paper[]): BlobLayout[] {
  // Group by topic
  const groups = new Map<string, { topic: TopicDef; papers: Paper[] }>();
  for (const p of papers) {
    const topic = classifyPaper(p.title);
    const existing = groups.get(topic.label);
    if (existing) {
      existing.papers.push(p);
    } else {
      groups.set(topic.label, { topic, papers: [p] });
    }
  }

  // Calculate blob sizes
  const blobs: Omit<BlobLayout, "x" | "y">[] = [];
  for (const { topic, papers: paps } of groups.values()) {
    const cols = Math.min(BLOB_COLS, paps.length);
    const rows = Math.ceil(paps.length / cols);
    const w = cols * CARD_W + (cols - 1) * CARD_GAP + BLOB_PAD_X * 2;
    const h = rows * CARD_H + (rows - 1) * CARD_GAP + BLOB_PAD_Y * 2 + BLOB_LABEL_H;
    blobs.push({ topic, papers: paps, w, h });
  }

  // Sort by size descending for nicer packing
  blobs.sort((a, b) => b.papers.length - a.papers.length);

  // Arrange blobs in a grid (up to 3 columns)
  const gridCols = Math.min(3, blobs.length);
  const colWidths: number[] = new Array(gridCols).fill(0);
  const result: BlobLayout[] = [];

  // First pass: compute column widths
  for (let i = 0; i < blobs.length; i++) {
    const col = i % gridCols;
    colWidths[col] = Math.max(colWidths[col], blobs[i].w);
  }

  // Compute column x offsets
  const colX: number[] = [];
  let cx = 0;
  for (let c = 0; c < gridCols; c++) {
    colX.push(cx);
    cx += colWidths[c] + BLOB_GAP;
  }

  // Place blobs row by row
  const colY: number[] = new Array(gridCols).fill(0);
  for (let i = 0; i < blobs.length; i++) {
    const col = i % gridCols;
    const x = colX[col];
    const y = colY[col];
    result.push({ ...blobs[i], x, y });
    colY[col] += blobs[i].h + BLOB_GAP;
  }

  return result;
}

/* ── Component ── */

export function PaperMap({
  papers,
}: {
  papers: Paper[];
  treeDataList?: unknown[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedPos, setSelectedPos] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const blobs = useMemo(() => layoutBlobs(papers), [papers]);

  // Canvas bounds
  const canvasW = useMemo(() => {
    if (blobs.length === 0) return 800;
    return Math.max(...blobs.map((b) => b.x + b.w)) + 100;
  }, [blobs]);
  const canvasH = useMemo(() => {
    if (blobs.length === 0) return 600;
    return Math.max(...blobs.map((b) => b.y + b.h)) + 100;
  }, [blobs]);

  // Auto-center on mount / fullscreen toggle
  useEffect(() => {
    if (blobs.length === 0 || !containerRef.current) return;
    const frame = requestAnimationFrame(() => {
      const rect = containerRef.current!.getBoundingClientRect();
      const scaleX = rect.width / canvasW;
      const scaleY = rect.height / canvasH;
      const scale = Math.min(scaleX, scaleY, 1.2);
      const centerX = canvasW / 2;
      const centerY = canvasH / 2;
      setZoom(scale);
      setPan({
        x: rect.width / 2 - centerX * scale,
        y: rect.height / 2 - centerY * scale,
      });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobs.length, isFullscreen]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
      setPan({
        x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
      });
      setZoom(newZoom);
    },
    [zoom, pan]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("[data-card], [data-detail]")) return;
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [dragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  if (papers.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center">
        <p className="text-sm text-gray-400">
          No papers yet. Save papers to build your research map.
        </p>
      </div>
    );
  }

  const mapContent = (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${
        isFullscreen
          ? "h-screen w-screen bg-white"
          : "h-full rounded-2xl border border-gray-100 bg-gray-50/40"
      }`}
      style={{ cursor: dragging ? "grabbing" : "grab" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => setSelectedPaper(null)}
    >
      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: canvasW,
          height: canvasH,
        }}
      >
        {/* Topic blobs */}
        {blobs.map((blob) => (
          <div
            key={blob.topic.label}
            className="absolute rounded-2xl"
            style={{
              left: blob.x,
              top: blob.y,
              width: blob.w,
              height: blob.h,
              backgroundColor: blob.topic.bg,
              border: `1.5px solid ${blob.topic.border}`,
            }}
          >
            {/* Topic label */}
            <div
              className="px-4 pt-2.5 text-xs font-bold uppercase tracking-wide"
              style={{ color: blob.topic.accent, height: BLOB_LABEL_H }}
            >
              {blob.topic.label}
              <span className="ml-1.5 font-normal opacity-60">
                {blob.papers.length}
              </span>
            </div>

            {/* Paper cards */}
            <div
              className="flex flex-wrap gap-2 px-4 pb-3"
              style={{ gap: CARD_GAP }}
            >
              {blob.papers.map((paper) => {
                const author = firstAuthor(paper.authors);
                return (
                  <div
                    key={paper.arxiv_id}
                    data-card
                    className="flex cursor-pointer flex-col justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition-shadow hover:shadow-md"
                    style={{ width: CARD_W, height: CARD_H }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPaper?.arxiv_id === paper.arxiv_id) {
                        setSelectedPaper(null);
                      } else {
                        const cardRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const containerRect = containerRef.current!.getBoundingClientRect();
                        setSelectedPos({
                          x: (cardRect.left - containerRect.left - pan.x) / zoom,
                          y: (cardRect.bottom - containerRect.top - pan.y) / zoom + 6,
                        });
                        setSelectedPaper(paper);
                      }
                    }}
                  >
                    <p className="text-[11px] font-semibold leading-snug text-gray-900">
                      {truncate(paper.title, 70)}
                    </p>
                    {author && (
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {truncate(author, 35)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Detail popover */}
        {selectedPaper && (
          <div
            data-detail
            className="absolute z-20 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
            style={{ left: selectedPos.x, top: selectedPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold leading-snug text-gray-900">
                {selectedPaper.title}
              </h3>
              <button
                onClick={() => setSelectedPaper(null)}
                className="shrink-0 text-gray-400 hover:text-gray-600"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {selectedPaper.authors && (
              <p className="mt-1 text-xs text-gray-400">{selectedPaper.authors}</p>
            )}
            <div className="mt-3">
              <a
                href={`/abs/${selectedPaper.arxiv_id}`}
                className="inline-flex items-center gap-0.5 text-xs font-medium text-black hover:underline"
              >
                View paper
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm transition-colors hover:text-gray-900"
        >
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>
        <button
          onClick={() => setZoom(Math.min(3, zoom * 1.2))}
          className="h-7 w-7 rounded-lg bg-white text-xs text-gray-500 shadow-sm transition-colors hover:text-gray-900"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(0.1, zoom * 0.8))}
          className="h-7 w-7 rounded-lg bg-white text-xs text-gray-500 shadow-sm transition-colors hover:text-gray-900"
        >
          -
        </button>
      </div>

      {isFullscreen && (
        <div className="absolute left-4 top-4">
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-800"
          >
            &larr;
            <img src="/arxivmap.png" alt="" className="h-5 w-5" />
            Arxiv Map
          </a>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <>
        <div className="h-[500px]" />
        {createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
            {mapContent}
          </div>,
          document.body
        )}
      </>
    );
  }

  return mapContent;
}
