"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  CARD_W,
  CARD_H,
  radialPositions,
  blobRadius,
  packCircles,
} from "@/lib/map-layout";
import type { StoredMapData } from "@/lib/paper-map-ai";
import { ChatPanel } from "@/app/abs/[paperId]/chat-panel";

/* ── Types ── */

interface Paper {
  arxiv_id: string;
  title: string;
  authors?: string;
}

/* ── Helpers ── */

function firstAuthor(authors?: string): string {
  if (!authors) return "";
  const first = authors.split(",")[0].trim();
  return authors.includes(",") ? `${first} et al.` : first;
}

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(400);
  const chatDragRef = useRef(false);
  const chatDragStartX = useRef(0);
  const chatDragStartW = useRef(400);

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
    // Fallback: single blob with all papers (no keyword classification)
    const positions = radialPositions(papers.length);
    const r = blobRadius(positions);
    return packCircles([{
      topic: { label: "Papers", keywords: [], fill: "rgba(209,213,219,0.35)", stroke: "none", text: "#6b7280" },
      papers,
      r,
      cardPositions: positions,
    }]);
  }, [cachedMap, papers]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!chatDragRef.current) return;
      const newWidth = Math.min(700, Math.max(280, chatDragStartW.current + (chatDragStartX.current - e.clientX)));
      setChatWidth(newWidth);
    };
    const onPointerUp = () => {
      chatDragRef.current = false;
    };
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const chatContext = useMemo(() => {
    const totalPapers = circles.reduce((sum, c) => sum + c.papers.length, 0);
    let ctx = `Paper map with ${totalPapers} papers across ${circles.length} topics:\n`;
    for (const c of circles) {
      ctx += `\nTopic: "${c.topic.label}"\n`;
      for (const p of c.papers) {
        ctx += `- "${p.title}" (${p.arxiv_id})\n`;
      }
    }
    return ctx;
  }, [circles]);

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
        isFullscreen ? "h-full w-full" : "h-full rounded-2xl border border-gray-200"
      }`}
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
          backgroundImage: "radial-gradient(circle, #d1d5db 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
          opacity: 0.3,
        }}
      />

      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {/* SVG circles with soft edges */}
        <svg
          className="pointer-events-none absolute overflow-visible"
          style={{ left: 0, top: 0, width: 1, height: 1 }}
        >
          <defs>
            <filter id="soft-edge" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
            </filter>
          </defs>
          {circles.map((c) => (
            <circle
              key={`bg-${c.topic.label}`}
              cx={c.cx}
              cy={c.cy}
              r={c.r - 10}
              fill={c.topic.fill}
              stroke="none"
              filter="url(#soft-edge)"
            />
          ))}
        </svg>

        {/* Topic circles with cards */}
        {circles.map((circle) => {
          // Find the direction away from other circles for label placement
          const awayDir = (() => {
            let dx = 0, dy = 0;
            for (const other of circles) {
              if (other === circle) continue;
              dx += circle.cx - other.cx;
              dy += circle.cy - other.cy;
            }
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) return { x: 0, y: -1 }; // default: top
            return { x: dx / len, y: dy / len };
          })();

          return (
          <div key={circle.topic.label}>
            {/* Topic label */}
            <div
              className="pointer-events-none absolute flex flex-col items-center"
              style={{
                left: circle.cx + awayDir.x * (circle.r - 24),
                top: circle.cy + awayDir.y * (circle.r - 24),
                transform: "translate(-50%, -50%)",
                zIndex: 20,
              }}
            >
              <span
                className="rounded-full bg-white px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider shadow-sm"
                style={{ color: circle.topic.text }}
              >
                {circle.topic.label}
              </span>
              <span className="mt-0.5 text-[10px] text-gray-400">
                {circle.papers.length}
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
                  className="absolute cursor-pointer rounded-xl bg-white transition-all duration-200"
                  style={{
                    left: circle.cx + pos.x - CARD_W / 2,
                    top: circle.cy + pos.y - CARD_H / 2,
                    width: CARD_W,
                    minHeight: CARD_H,
                    zIndex: isHovered || isSelected ? 15 : 10,
                    boxShadow: isHovered
                      ? "0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)"
                      : "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                    transform: isHovered ? "translateY(-2px)" : "translateY(0)",
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
                  <div className="flex flex-col justify-center px-3.5 py-3">
                    <p className="text-[12px] font-medium leading-snug text-gray-800">
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
          );
        })}

        {/* Detail popover */}
        {selectedPaper && (
          <div
            data-detail
            className="absolute z-20 w-72 rounded-xl bg-white p-4"
            style={{ left: selectedPos.x, top: selectedPos.y, boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
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

    </div>
  );

  if (isFullscreen) {
    return (
      <>
        <div className="h-[500px]" />
        {createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 99999 }} className="flex flex-col">
            <header className="flex items-center gap-4 border-b border-gray-100 bg-white px-6 py-3">
              <a
                href="/"
                className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-800"
              >
                &larr;
                <img src="/arxivmap.png" alt="" className="h-5 w-5" />
                Arxiv Map
              </a>
              <span className="flex-1" />
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  chatOpen
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-500 transition-all hover:border-gray-400 hover:text-gray-800"
              >
                Exit fullscreen
              </button>
            </header>
            <div className="relative flex flex-1 overflow-hidden">
              <div className="flex-1">{mapContent}</div>
              {chatOpen && (
                <aside className="relative h-full shrink-0 bg-white" style={{ width: chatWidth }}>
                  <div
                    className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-gray-300 active:bg-gray-400 transition-colors"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      chatDragRef.current = true;
                      chatDragStartX.current = e.clientX;
                      chatDragStartW.current = chatWidth;
                    }}
                  />
                  <div className="h-full border-l border-gray-100">
                    <ChatPanel abstract={chatContext} />
                  </div>
                </aside>
              )}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return mapContent;
}
