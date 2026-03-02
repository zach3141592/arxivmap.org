"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

/* ── Relationship colors (matching tree-visualization.tsx) ── */

const RELATIONSHIP_COLORS: Record<string, string> = {
  foundational: "#3b82f6",
  extends: "#22c55e",
  alternative: "#f97316",
  applies: "#8b5cf6",
  successor: "#06b6d4",
};

/* ── Types ── */

interface MapNode {
  id: string;
  title: string;
  authors?: string;
  year?: number;
  relationship?: string;
  relevance?: string;
  x: number;
  y: number;
}

interface MapEdge {
  source: string;
  target: string;
  label?: string;
}

interface Paper {
  arxiv_id: string;
  title: string;
  authors?: string;
}

interface TreeData {
  root: string;
  nodes: {
    id: string;
    title: string;
    authors?: string;
    year?: number;
    relationship?: string;
    relevance?: string;
  }[];
  edges: { source: string; target: string; label?: string }[];
}

/* ── Layout constants ── */

const NODE_W = 280;
const NODE_H = 80;

/* ── Helpers ── */

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "\u2026";
}

function firstAuthor(authors?: string): string {
  if (!authors) return "";
  const first = authors.split(",")[0].trim();
  const hasMore = authors.includes(",");
  return hasMore ? `${first} et al.` : first;
}

function colorForRelationship(rel?: string): string {
  if (!rel) return "#d1d5db";
  return RELATIONSHIP_COLORS[rel] ?? "#d1d5db";
}

/* ── Graph builder ── */

function buildGraph(papers: Paper[], treeDataList: TreeData[]) {
  const nodeMap = new Map<string, MapNode>();

  // Add all user papers as nodes
  for (const p of papers) {
    nodeMap.set(p.arxiv_id, {
      id: p.arxiv_id,
      title: p.title,
      authors: p.authors,
      x: 0,
      y: 0,
    });
  }

  // Add ALL tree nodes (including discovered papers) and enrich metadata
  for (const tree of treeDataList) {
    for (const tn of tree.nodes) {
      const existing = nodeMap.get(tn.id);
      if (existing) {
        if (!existing.authors && tn.authors) existing.authors = tn.authors;
        if (!existing.year && tn.year) existing.year = tn.year;
        if (!existing.relationship && tn.relationship) existing.relationship = tn.relationship;
        if (!existing.relevance && tn.relevance) existing.relevance = tn.relevance;
      } else {
        nodeMap.set(tn.id, {
          id: tn.id,
          title: tn.title,
          authors: tn.authors,
          year: tn.year,
          relationship: tn.relationship,
          relevance: tn.relevance,
          x: 0,
          y: 0,
        });
      }
    }
  }

  // Collect edges between all nodes present in the graph
  const edgeSet = new Set<string>();
  const edges: MapEdge[] = [];
  for (const tree of treeDataList) {
    for (const e of tree.edges) {
      const key = [e.source, e.target].sort().join("--");
      if (!edgeSet.has(key) && nodeMap.has(e.source) && nodeMap.has(e.target)) {
        edgeSet.add(key);
        edges.push({ source: e.source, target: e.target, label: e.label });
      }
    }
  }

  const nodes = [...nodeMap.values()];
  const userPaperIds = new Set(papers.map((p) => p.arxiv_id));

  // Layout: circular start → force simulation
  const cx = 600;
  const cy = 400;
  const radius = Math.max(300, nodes.length * 35);

  for (let i = 0; i < nodes.length; i++) {
    const angle = (2 * Math.PI * i) / nodes.length;
    nodes[i].x = cx + radius * Math.cos(angle);
    nodes[i].y = cy + radius * Math.sin(angle);
  }

  // Force simulation with higher repulsion for larger nodes
  const idxMap = new Map(nodes.map((n, i) => [n.id, i]));
  for (let iter = 0; iter < 120; iter++) {
    const forces = nodes.map(() => ({ fx: 0, fy: 0 }));

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const repulse = 300000 / (dist * dist);
        dx /= dist;
        dy /= dist;
        forces[i].fx -= dx * repulse;
        forces[i].fy -= dy * repulse;
        forces[j].fx += dx * repulse;
        forces[j].fy += dy * repulse;
      }
    }

    // Attraction along edges
    for (const e of edges) {
      const si = idxMap.get(e.source);
      const ti = idxMap.get(e.target);
      if (si === undefined || ti === undefined) continue;
      let dx = nodes[ti].x - nodes[si].x;
      let dy = nodes[ti].y - nodes[si].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const attract = (dist - 220) * 0.025;
      dx /= dist;
      dy /= dist;
      forces[si].fx += dx * attract;
      forces[si].fy += dy * attract;
      forces[ti].fx -= dx * attract;
      forces[ti].fy -= dy * attract;
    }

    // Center gravity
    for (let i = 0; i < nodes.length; i++) {
      forces[i].fx += (cx - nodes[i].x) * 0.0005;
      forces[i].fy += (cy - nodes[i].y) * 0.0005;
    }

    // Apply forces
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x += Math.max(-15, Math.min(15, forces[i].fx));
      nodes[i].y += Math.max(-15, Math.min(15, forces[i].fy));
    }
  }

  const rootIds = new Set(treeDataList.map((t) => t.root));
  return { nodes, edges, userPaperIds, rootIds };
}

/* ── Component ── */

export function PaperMap({
  papers,
  treeDataList,
}: {
  papers: Paper[];
  treeDataList: TreeData[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { nodes, edges, userPaperIds, rootIds } = buildGraph(papers, treeDataList);

  // Build lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Re-center on mount / fullscreen toggle
  useEffect(() => {
    if (nodes.length === 0 || !containerRef.current) return;
    const frame = requestAnimationFrame(() => {
      const rect = containerRef.current!.getBoundingClientRect();
      const minX = Math.min(...nodes.map((n) => n.x));
      const maxX = Math.max(...nodes.map((n) => n.x));
      const minY = Math.min(...nodes.map((n) => n.y));
      const maxY = Math.max(...nodes.map((n) => n.y));
      const graphW = maxX - minX + NODE_W + 200;
      const graphH = maxY - minY + NODE_H + 200;
      const scaleX = rect.width / graphW;
      const scaleY = rect.height / graphH;
      const scale = Math.min(scaleX, scaleY, 1.2);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      setZoom(scale);
      setPan({
        x: rect.width / 2 - centerX * scale,
        y: rect.height / 2 - centerY * scale,
      });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, isFullscreen]);

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
      // Don't start drag on node or popover click
      if ((e.target as HTMLElement).closest("[data-node], [data-detail]")) return;
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

  if (nodes.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center">
        <p className="text-sm text-gray-400">
          No papers yet. Look up papers and generate research trees to build your map.
        </p>
      </div>
    );
  }

  // Connected set for hover highlighting
  const connectedToHovered = new Set<string>();
  if (hoveredNode) {
    connectedToHovered.add(hoveredNode);
    for (const e of edges) {
      if (e.source === hoveredNode) connectedToHovered.add(e.target);
      if (e.target === hoveredNode) connectedToHovered.add(e.source);
    }
  }

  // Compute SVG canvas bounds
  const svgW = Math.max(...nodes.map((n) => n.x)) + NODE_W + 400;
  const svgH = Math.max(...nodes.map((n) => n.y)) + NODE_H + 400;

  const selectedData = selectedNode ? nodeMap.get(selectedNode) : null;

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
    >
      <div
        ref={innerRef}
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: svgW,
          height: svgH,
        }}
      >
        {/* SVG layer for edges */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={svgW}
          height={svgH}
        >
          <defs>
            {edges.map((e, i) => {
              const targetNode = nodeMap.get(e.target);
              const edgeColor = colorForRelationship(targetNode?.relationship);
              return (
                <marker
                  key={`arrow-${i}`}
                  id={`arrow-${i}`}
                  viewBox="0 0 10 7"
                  refX="10"
                  refY="3.5"
                  markerWidth="8"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill={edgeColor} />
                </marker>
              );
            })}
          </defs>
          {edges.map((e, i) => {
            const s = nodeMap.get(e.source);
            const t = nodeMap.get(e.target);
            if (!s || !t) return null;

            const dimmed =
              hoveredNode &&
              (!connectedToHovered.has(s.id) || !connectedToHovered.has(t.id));
            const highlighted =
              hoveredNode &&
              connectedToHovered.has(s.id) &&
              connectedToHovered.has(t.id);

            const edgeColor = colorForRelationship(t.relationship);

            // Bezier curve from center of nodes
            const x1 = s.x + NODE_W / 2;
            const y1 = s.y + NODE_H / 2;
            const x2 = t.x + NODE_W / 2;
            const y2 = t.y + NODE_H / 2;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const cx1 = x1 + dx * 0.4;
            const cy1 = y1;
            const cx2 = x2 - dx * 0.4;
            const cy2 = y2;

            const strokeColor = dimmed
              ? "#f0f0f0"
              : highlighted
                ? edgeColor
                : edgeColor + "88"; // semi-transparent when not hovered

            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={highlighted ? 2.5 : 2}
                markerEnd={dimmed ? undefined : `url(#arrow-${i})`}
              />
            );
          })}
        </svg>

        {/* HTML node cards */}
        {nodes.map((node) => {
          const isUserPaper = userPaperIds.has(node.id);
          const isRoot = rootIds.has(node.id);
          const isHovered = hoveredNode === node.id;
          const dimmed = hoveredNode && !connectedToHovered.has(node.id);
          const barColor = colorForRelationship(node.relationship);
          const authorSnippet = firstAuthor(node.authors);
          const yearStr = node.year && node.year > 0 ? String(node.year) : "";

          return (
            <div
              key={node.id}
              data-node
              className="absolute select-none rounded-lg border transition-shadow"
              style={{
                left: node.x - NODE_W / 2,
                top: node.y - NODE_H / 2,
                width: NODE_W,
                minHeight: NODE_H,
                backgroundColor: isHovered ? "#111" : isUserPaper ? "#fff" : "#fafafa",
                borderColor: isHovered ? "#111" : isRoot ? "#111" : isUserPaper ? "#e5e5e5" : "#f0f0f0",
                borderWidth: isRoot ? 2 : 1,
                opacity: dimmed ? 0.2 : 1,
                cursor: "pointer",
                zIndex: isHovered ? 12 : 10,
                boxShadow: isHovered
                  ? "0 4px 12px rgba(0,0,0,0.08)"
                  : isRoot
                    ? "0 2px 8px rgba(0,0,0,0.1)"
                    : "0 1px 3px rgba(0,0,0,0.04)",
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(selectedNode === node.id ? null : node.id);
              }}
            >
              {/* Left color bar */}
              <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
                style={{ backgroundColor: barColor }}
              />
              <div className="flex h-full flex-col justify-center py-2.5 pl-3.5 pr-3">
                <p
                  className="text-[11px] font-semibold leading-snug"
                  style={{ color: isHovered ? "#fff" : "#111" }}
                >
                  {truncate(node.title, 90)}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  {authorSnippet && (
                    <span
                      className="text-[10px]"
                      style={{ color: isHovered ? "#a1a1aa" : "#9ca3af" }}
                    >
                      {truncate(authorSnippet, 30)}
                    </span>
                  )}
                  {yearStr && (
                    <span
                      className="text-[10px] tabular-nums"
                      style={{ color: isHovered ? "#a1a1aa" : "#9ca3af" }}
                    >
                      {yearStr}
                    </span>
                  )}
                  {node.relationship && (
                    <span
                      className="ml-auto inline-block rounded-full px-1.5 py-px text-[9px] font-medium text-white"
                      style={{ backgroundColor: barColor }}
                    >
                      {node.relationship}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Edge labels — always visible */}
        {edges.map((e, i) => {
          if (!e.label) return null;

          const s = nodeMap.get(e.source);
          const t = nodeMap.get(e.target);
          if (!s || !t) return null;

          const dimmed =
            hoveredNode &&
            (!connectedToHovered.has(s.id) || !connectedToHovered.has(t.id));
          const highlighted =
            hoveredNode &&
            connectedToHovered.has(s.id) &&
            connectedToHovered.has(t.id);

          const edgeColor = colorForRelationship(t.relationship);
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2;

          return (
            <div
              key={`label-${i}`}
              className="pointer-events-none absolute select-none whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-medium shadow-sm"
              style={{
                left: mx,
                top: my,
                transform: "translate(-50%, -50%)",
                zIndex: 15,
                backgroundColor: highlighted ? edgeColor : "#fff",
                color: highlighted ? "#fff" : edgeColor,
                border: `1px solid ${dimmed ? "#e5e5e5" : edgeColor}`,
                opacity: dimmed ? 0.15 : 1,
              }}
            >
              {e.label}
            </div>
          );
        })}

        {/* Detail popover */}
        {selectedData && (
          <div
            data-detail
            className="absolute z-20 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
            style={{
              left: selectedData.x - NODE_W / 2,
              top: selectedData.y + NODE_H / 2 + 10,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold leading-snug text-gray-900">
                {selectedData.title}
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="shrink-0 text-gray-400 hover:text-gray-600"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {selectedData.authors && (
              <p className="mt-1 text-xs text-gray-400">{selectedData.authors}</p>
            )}
            {selectedData.relevance && (
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                {selectedData.relevance}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              {selectedData.relationship && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{
                    backgroundColor: colorForRelationship(selectedData.relationship),
                  }}
                >
                  {selectedData.relationship}
                </span>
              )}
              {selectedData.year && selectedData.year > 0 && (
                <span className="text-xs text-gray-400">{selectedData.year}</span>
              )}
              <a
                href={`/abs/${selectedData.id}`}
                className="ml-auto inline-flex items-center gap-0.5 text-xs font-medium text-black hover:underline"
              >
                View paper
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
