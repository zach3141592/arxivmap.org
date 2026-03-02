"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";

/* ── Topic classification ── */

interface TopicDef {
  label: string;
  keywords: string[];
  fill: string;   // light circle fill
  stroke: string;  // circle border
  text: string;    // label text color
}

const TOPICS: TopicDef[] = [
  { label: "Reinforcement Learning", keywords: ["reinforcement", "reward", "policy"], fill: "rgba(219,234,254,0.55)", stroke: "#bfdbfe", text: "#64748b" },
  { label: "Reasoning", keywords: ["reasoning", "chain-of-thought", "thought", "logic"], fill: "rgba(254,249,195,0.5)", stroke: "#fde68a", text: "#a16207" },
  { label: "Interpretability", keywords: ["interpret", "explain", "mechanistic", "spectral"], fill: "rgba(209,250,229,0.5)", stroke: "#a7f3d0", text: "#15803d" },
  { label: "Language Models", keywords: ["language model", "llm", "transformer", "diffusion"], fill: "rgba(233,213,255,0.5)", stroke: "#d8b4fe", text: "#7e22ce" },
  { label: "Agents", keywords: ["agent", "autonomous", "tool", "mcp"], fill: "rgba(252,231,243,0.5)", stroke: "#f9a8d4", text: "#be185d" },
  { label: "Safety", keywords: ["safety", "alignment", "adversarial", "robustness"], fill: "rgba(254,226,226,0.5)", stroke: "#fca5a5", text: "#dc2626" },
];

const OTHER_TOPIC: TopicDef = { label: "Other", keywords: [], fill: "rgba(243,244,246,0.55)", stroke: "#d1d5db", text: "#6b7280" };

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

const CARD_W = 240;
const CARD_H = 76;
const RING_SPACING = 100;
const BLOB_PAD = 70;
const BLOB_OVERLAP = 40; // positive = circles overlap (Venn style)

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

/* ── Radial paper positions inside a circle ── */

function radialPositions(count: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const positions: { x: number; y: number }[] = [];

  positions.push({ x: 0, y: 0 });
  if (count === 1) return positions;

  let placed = 1;
  let ring = 1;
  while (placed < count) {
    const radius = ring * RING_SPACING;
    const circumference = 2 * Math.PI * radius;
    const fitCount = Math.max(3, Math.floor(circumference / (CARD_W * 0.65)));
    const inRing = Math.min(fitCount, count - placed);
    const angleOffset = ring % 2 === 0 ? 0 : Math.PI / inRing;

    for (let i = 0; i < inRing; i++) {
      const angle = (2 * Math.PI * i) / inRing - Math.PI / 2 + angleOffset;
      positions.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
      placed++;
    }
    ring++;
  }
  return positions;
}

function blobRadius(positions: { x: number; y: number }[]): number {
  if (positions.length === 0) return 100;
  const maxDist = Math.max(...positions.map((p) => Math.sqrt(p.x * p.x + p.y * p.y)));
  return maxDist + CARD_W / 2 + BLOB_PAD;
}

/* ── Circle packing ── */

interface CircleBlob {
  topic: TopicDef;
  papers: Paper[];
  cx: number;
  cy: number;
  r: number;
  cardPositions: { x: number; y: number }[];
}

function layoutCircles(papers: Paper[]): CircleBlob[] {
  const groups = new Map<string, { topic: TopicDef; papers: Paper[] }>();
  for (const p of papers) {
    const topic = classifyPaper(p.title);
    const existing = groups.get(topic.label);
    if (existing) existing.papers.push(p);
    else groups.set(topic.label, { topic, papers: [p] });
  }

  const blobs: Omit<CircleBlob, "cx" | "cy">[] = [];
  for (const { topic, papers: paps } of groups.values()) {
    const positions = radialPositions(paps.length);
    const r = blobRadius(positions);
    blobs.push({ topic, papers: paps, r, cardPositions: positions });
  }

  blobs.sort((a, b) => b.r - a.r);

  const placed: CircleBlob[] = [];
  for (const blob of blobs) {
    if (placed.length === 0) {
      placed.push({ ...blob, cx: 0, cy: 0 });
      continue;
    }

    // Place circles so they overlap by BLOB_OVERLAP (Venn style)
    // but keep paper cards from colliding across blobs
    const minDist = blob.r + placed[0].r - BLOB_OVERLAP;
    let bestCx = 0, bestCy = 0, found = false;
    for (let dist = minDist; dist < 3000 && !found; dist += 8) {
      const steps = Math.max(1, Math.floor((2 * Math.PI * dist) / 30));
      for (let s = 0; s < steps && !found; s++) {
        const angle = (2 * Math.PI * s) / steps;
        const tx = dist * Math.cos(angle);
        const ty = dist * Math.sin(angle);
        let tooClose = false;
        for (const p of placed) {
          const dx = tx - p.cx;
          const dy = ty - p.cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          // Cards live within ~(r - BLOB_PAD) of center; keep card zones apart
          const cardZone = (blob.r - BLOB_PAD + 20) + (p.r - BLOB_PAD + 20);
          if (d < cardZone) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) {
          bestCx = tx;
          bestCy = ty;
          found = true;
        }
      }
    }
    placed.push({ ...blob, cx: bestCx, cy: bestCy });
  }

  return placed;
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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const circles = useMemo(() => layoutCircles(papers), [papers]);

  const bounds = useMemo(() => {
    if (circles.length === 0) return { minX: -400, minY: -300, maxX: 400, maxY: 300 };
    const minX = Math.min(...circles.map((c) => c.cx - c.r)) - 50;
    const minY = Math.min(...circles.map((c) => c.cy - c.r)) - 50;
    const maxX = Math.max(...circles.map((c) => c.cx + c.r)) + 50;
    const maxY = Math.max(...circles.map((c) => c.cy + c.r)) + 50;
    return { minX, minY, maxX, maxY };
  }, [circles]);

  const canvasW = bounds.maxX - bounds.minX;
  const canvasH = bounds.maxY - bounds.minY;

  useEffect(() => {
    if (circles.length === 0 || !containerRef.current) return;
    const frame = requestAnimationFrame(() => {
      const rect = containerRef.current!.getBoundingClientRect();
      const scaleX = rect.width / canvasW;
      const scaleY = rect.height / canvasH;
      const scale = Math.min(scaleX, scaleY, 1.0);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      setZoom(scale);
      setPan({
        x: rect.width / 2 - centerX * scale,
        y: rect.height / 2 - centerY * scale,
      });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circles.length, isFullscreen]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.05, Math.min(3, zoom * delta));
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

  const handleMouseUp = useCallback(() => setDragging(false), []);

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
      className={`relative overflow-hidden bg-white ${
        isFullscreen ? "h-screen w-screen" : "h-full rounded-2xl border border-gray-200"
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
        }}
      >
        {/* SVG circles */}
        <svg
          className="pointer-events-none absolute overflow-visible"
          style={{ left: 0, top: 0, width: 1, height: 1 }}
        >
          {circles.map((c) => (
            <circle
              key={`bg-${c.topic.label}`}
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill={c.topic.fill}
              stroke={c.topic.stroke}
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Topic circles with cards */}
        {circles.map((circle) => (
          <div key={circle.topic.label}>
            {/* Topic label */}
            <div
              className="pointer-events-none absolute flex flex-col items-center"
              style={{
                left: circle.cx,
                top: circle.cy - circle.r + 20,
                transform: "translateX(-50%)",
                zIndex: 5,
              }}
            >
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: circle.topic.text }}
              >
                {circle.topic.label}
              </span>
              <span className="text-[10px] text-gray-400">
                {circle.papers.length} paper{circle.papers.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Paper cards */}
            {circle.papers.map((paper, i) => {
              const pos = circle.cardPositions[i];
              if (!pos) return null;
              const author = firstAuthor(paper.authors);
              const isHovered = hoveredCard === paper.arxiv_id;
              const isSelected = selectedPaper?.arxiv_id === paper.arxiv_id;

              return (
                <div
                  key={paper.arxiv_id}
                  data-card
                  className="absolute cursor-pointer rounded-lg border bg-white transition-shadow duration-150"
                  style={{
                    left: circle.cx + pos.x - CARD_W / 2,
                    top: circle.cy + pos.y - CARD_H / 2,
                    width: CARD_W,
                    minHeight: CARD_H,
                    zIndex: isHovered || isSelected ? 15 : 10,
                    borderColor: isHovered || isSelected ? circle.topic.stroke : "#e5e7eb",
                    boxShadow: isHovered
                      ? "0 2px 8px rgba(0,0,0,0.08)"
                      : "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                  onMouseEnter={() => setHoveredCard(paper.arxiv_id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPaper?.arxiv_id === paper.arxiv_id) {
                      setSelectedPaper(null);
                    } else {
                      const cardRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const containerRect = containerRef.current!.getBoundingClientRect();
                      setSelectedPos({
                        x: (cardRect.left - containerRect.left - pan.x) / zoom,
                        y: (cardRect.bottom - containerRect.top - pan.y) / zoom + 8,
                      });
                      setSelectedPaper(paper);
                    }
                  }}
                >
                  <div className="flex flex-col justify-center px-3 py-2.5">
                    <p className="text-[12px] font-medium leading-snug text-gray-900">
                      {paper.title}
                    </p>
                    {author && (
                      <p className="mt-1 text-[11px] text-gray-400">
                        {author}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
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
          onClick={() => setZoom(Math.max(0.05, zoom * 0.8))}
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
