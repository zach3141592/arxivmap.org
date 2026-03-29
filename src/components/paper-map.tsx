"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  CARD_W,
  CARD_H,
  radialPositions,
  blobRadius,
  packCircles,
} from "@/lib/map-layout";
import type { StoredMapData } from "@/lib/paper-map-ai";

/* ── Types ── */

interface Paper {
  arxiv_id: string;
  title: string;
  authors?: string;
}

/* ── Color palette ── */

const PALETTE = [
  { border: "#3b82f6", glow: "rgba(59,130,246,0.3)",  text: "#2563eb" },
  { border: "#d97706", glow: "rgba(217,119,6,0.3)",   text: "#b45309" },
  { border: "#059669", glow: "rgba(5,150,105,0.3)",   text: "#047857" },
  { border: "#7c3aed", glow: "rgba(124,58,237,0.3)",  text: "#6d28d9" },
  { border: "#db2777", glow: "rgba(219,39,119,0.3)",  text: "#be185d" },
  { border: "#dc2626", glow: "rgba(220,38,38,0.3)",   text: "#b91c1c" },
  { border: "#ca8a04", glow: "rgba(202,138,4,0.3)",   text: "#a16207" },
  { border: "#0284c7", glow: "rgba(2,132,199,0.3)",   text: "#0369a1" },
];

/* ── Helpers ── */

function firstAuthor(authors?: string): string {
  if (!authors) return "";
  const first = authors.split(",")[0].trim();
  return authors.includes(",") ? `${first} et al.` : first;
}

/* ── Visual node size ── */
const NODE_W = 120;
const NODE_H = 38;

/* ── Component ── */

export function PaperMap({
  papers,
  cachedMap,
}: {
  papers: Paper[];
  cachedMap?: StoredMapData | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedPos, setSelectedPos] = useState({ x: 0, y: 0 });
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const circles = useMemo(() => {
    if (cachedMap) {
      return cachedMap.topics.map((topic) => ({
        topic: { label: topic.label, keywords: [], fill: topic.fill, stroke: topic.stroke, text: topic.text },
        papers: topic.paper_ids.map((id) => papers.find((p) => p.arxiv_id === id)).filter((p): p is Paper => !!p),
        cx: topic.cx,
        cy: topic.cy,
        r: topic.r,
        cardPositions: topic.cardPositions,
      }));
    }
    const positions = radialPositions(papers.length);
    const r = blobRadius(positions);
    return packCircles([{
      topic: { label: "Papers", keywords: [], fill: "rgba(209,213,219,0.35)", stroke: "none", text: "#6b7280" },
      papers,
      r,
      cardPositions: positions,
    }]);
  }, [cachedMap, papers]);

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
  }, [circles.length]);

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
      <div className="flex h-full items-center justify-center bg-white">
        <p className="text-sm text-gray-400">
          No papers yet. Save papers to build your research map.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-white"
      style={{ cursor: dragging ? "grabbing" : "grab" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => setSelectedPaper(null)}
    >
      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, #d1d5db 0.6px, transparent 0.6px)",
          backgroundSize: "28px 28px",
          opacity: 0.5,
        }}
      />

      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {/* SVG edges + hub circles */}
        <svg
          className="pointer-events-none absolute overflow-visible"
          style={{ left: 0, top: 0, width: 1, height: 1 }}
        >
          <defs>
            {circles.map((_, ci) => (
              <filter key={`glow-${ci}`} id={`hub-glow-${ci}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {circles.map((c, ci) => {
            const color = PALETTE[ci % PALETTE.length];
            return (
              <g key={`edges-${c.topic.label}`}>
                {c.papers.map((paper, i) => {
                  const pos = c.cardPositions[i];
                  if (!pos) return null;
                  return (
                    <line
                      key={paper.arxiv_id}
                      x1={c.cx}
                      y1={c.cy}
                      x2={c.cx + pos.x}
                      y2={c.cy + pos.y}
                      stroke={color.border}
                      strokeOpacity={0.2}
                      strokeWidth={1}
                    />
                  );
                })}
                <circle
                  cx={c.cx}
                  cy={c.cy}
                  r={6}
                  fill={color.border}
                  filter={`url(#hub-glow-${ci})`}
                />
              </g>
            );
          })}
        </svg>

        {/* Topic labels + paper nodes */}
        {circles.map((circle, ci) => {
          const color = PALETTE[ci % PALETTE.length];

          return (
            <div key={circle.topic.label}>
              {/* Hub label */}
              <div
                className="pointer-events-none absolute"
                style={{
                  left: circle.cx,
                  top: circle.cy - 16,
                  transform: "translate(-50%, -100%)",
                  zIndex: 20,
                }}
              >
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                  style={{
                    color: color.text,
                    background: "rgba(255,255,255,0.9)",
                    border: `1px solid ${color.border}`,
                  }}
                >
                  {circle.topic.label}
                </span>
              </div>

              {/* Paper nodes */}
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
                    className="absolute cursor-pointer transition-all duration-150"
                    style={{
                      left: circle.cx + pos.x - NODE_W / 2,
                      top: circle.cy + pos.y - NODE_H / 2,
                      width: NODE_W,
                      height: NODE_H,
                      zIndex: isHovered || isSelected ? 15 : 10,
                      background: "white",
                      border: `1px solid ${color.border}`,
                      borderRadius: 6,
                      opacity: isHovered || isSelected ? 1 : 0.75,
                      boxShadow: isHovered || isSelected
                        ? `0 0 10px ${color.glow}, 0 2px 6px rgba(0,0,0,0.08)`
                        : "0 1px 3px rgba(0,0,0,0.06)",
                      transform: isHovered ? "translateY(-1px)" : "translateY(0)",
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
                        setSelectedTopicIdx(ci);
                      }
                    }}
                  >
                    <div className="flex flex-col justify-center px-2 py-1 h-full overflow-hidden">
                      <p
                        className="text-[10px] font-medium leading-tight text-gray-800 overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {paper.title}
                      </p>
                      {author && (
                        <p className="mt-0.5 text-[9px] truncate text-gray-400">
                          {author}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Detail popover */}
        {selectedPaper && (
          <div
            data-detail
            className="absolute z-20 w-64 rounded-xl bg-white p-4"
            style={{
              left: selectedPos.x,
              top: selectedPos.y,
              border: "1px solid #e5e7eb",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
            }}
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
                className="inline-flex items-center gap-0.5 text-xs font-medium hover:underline"
                style={{ color: PALETTE[selectedTopicIdx % PALETTE.length].text }}
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
      <div className="absolute bottom-4 left-4 flex gap-1">
        <button
          onClick={() => setZoom(Math.min(3, zoom * 1.2))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500 shadow-sm transition-colors hover:text-gray-900"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(0.05, zoom * 0.8))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500 shadow-sm transition-colors hover:text-gray-900"
        >
          −
        </button>
      </div>
    </div>
  );
}
