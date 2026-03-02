"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { ResearchTree, TreeNode } from "@/lib/research-tree";

const RELATIONSHIP_COLORS: Record<string, string> = {
  foundational: "#3b82f6",
  extends: "#22c55e",
  alternative: "#f97316",
  applies: "#8b5cf6",
  successor: "#06b6d4",
};

// Large palette of visually distinct colors for per-edge coloring
const EDGE_PALETTE = [
  "#e6194b", // red
  "#3cb44b", // green
  "#4363d8", // blue
  "#f58231", // orange
  "#911eb4", // purple
  "#42d4f4", // cyan
  "#f032e6", // magenta
  "#bfef45", // lime
  "#fabed4", // pink
  "#469990", // teal
  "#dcbeff", // lavender
  "#9a6324", // brown
  "#800000", // maroon
  "#aaffc3", // mint
  "#808000", // olive
  "#000075", // navy
];

const NODE_WIDTH = 320;
const NODE_HEIGHT = 60;
const ROW_GAP = 200;
const COL_GAP = 160;
const PADDING = 80;

interface LayoutNode {
  node: TreeNode;
  x: number;
  y: number;
}

function layoutNodes(tree: ResearchTree): LayoutNode[] {
  const root = tree.nodes.find((n) => n.id === tree.root);
  const others = tree.nodes.filter((n) => n.id !== tree.root);

  const above: TreeNode[] = [];
  const below: TreeNode[] = [];

  for (const node of others) {
    if (node.relationship === "foundational") {
      above.push(node);
    } else {
      below.push(node);
    }
  }

  above.sort((a, b) => a.year - b.year);
  below.sort((a, b) => a.year - b.year);

  const layouts: LayoutNode[] = [];

  const aboveRows = chunkNodes(above, 2);
  for (let rowIdx = 0; rowIdx < aboveRows.length; rowIdx++) {
    const row = aboveRows[rowIdx];
    const rowY = PADDING + rowIdx * (NODE_HEIGHT + ROW_GAP);
    layoutRow(row, rowY, layouts);
  }

  const rootY = PADDING + aboveRows.length * (NODE_HEIGHT + ROW_GAP);
  if (root) {
    layouts.push({ node: root, x: PADDING, y: rootY });
  }

  const belowRows = chunkNodes(below, 2);
  for (let rowIdx = 0; rowIdx < belowRows.length; rowIdx++) {
    const row = belowRows[rowIdx];
    const rowY = rootY + (rowIdx + 1) * (NODE_HEIGHT + ROW_GAP);
    layoutRow(row, rowY, layouts);
  }

  return layouts;
}

function chunkNodes(nodes: TreeNode[], maxPerRow: number): TreeNode[][] {
  const rows: TreeNode[][] = [];
  for (let i = 0; i < nodes.length; i += maxPerRow) {
    rows.push(nodes.slice(i, i + maxPerRow));
  }
  return rows;
}

function layoutRow(row: TreeNode[], y: number, layouts: LayoutNode[]) {
  for (let i = 0; i < row.length; i++) {
    layouts.push({
      node: row[i],
      x: PADDING + i * (NODE_WIDTH + COL_GAP),
      y,
    });
  }
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "\u2026";
}

export function TreeVisualization({
  tree,
  highlightPaperId,
}: {
  tree: ResearchTree;
  highlightPaperId?: string;
}) {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const layouts = useMemo(() => layoutNodes(tree), [tree]);

  const layoutMap = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    for (const l of layouts) {
      map.set(l.node.id, l);
    }
    return map;
  }, [layouts]);

  // Assign unique colors to edges — adjacent/crossing edges get different colors
  const edgeColors = useMemo(() => {
    const n = tree.edges.length;
    // Build conflict graph: edges that share a node or whose paths cross/are close
    const conflicts: Set<number>[] = Array.from({ length: n }, () => new Set());

    // Helper: get edge endpoints
    const endpoints = tree.edges.map((edge) => {
      const s = layoutMap.get(edge.source);
      const t = layoutMap.get(edge.target);
      if (!s || !t) return null;
      return {
        x1: s.x + NODE_WIDTH / 2, y1: s.y + NODE_HEIGHT,
        x2: t.x + NODE_WIDTH / 2, y2: t.y,
        source: edge.source, target: edge.target,
      };
    });

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = endpoints[i];
        const b = endpoints[j];
        if (!a || !b) continue;

        // Conflict if they share a node
        const sharesNode =
          a.source === b.source || a.source === b.target ||
          a.target === b.source || a.target === b.target;

        // Conflict if their midpoints are close (paths likely cross or run parallel)
        const midAx = (a.x1 + a.x2) / 2, midAy = (a.y1 + a.y2) / 2;
        const midBx = (b.x1 + b.x2) / 2, midBy = (b.y1 + b.y2) / 2;
        const dist = Math.hypot(midAx - midBx, midAy - midBy);
        const close = dist < 300;

        if (sharesNode || close) {
          conflicts[i].add(j);
          conflicts[j].add(i);
        }
      }
    }

    // Greedy graph coloring
    const colors: number[] = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const usedColors = new Set<number>();
      for (const j of conflicts[i]) {
        if (colors[j] >= 0) usedColors.add(colors[j]);
      }
      let c = 0;
      while (usedColors.has(c)) c++;
      colors[i] = c;
    }

    return colors.map((c) => EDGE_PALETTE[c % EDGE_PALETTE.length]);
  }, [tree.edges, layoutMap]);

  // Pre-compute edge label positions with collision resolution
  const edgeLabels = useMemo(() => {
    const margin = 6;
    const labels = tree.edges.map((edge, idx) => {
      const source = layoutMap.get(edge.source);
      const target = layoutMap.get(edge.target);
      if (!source || !target) return null;

      const x1 = source.x + NODE_WIDTH / 2;
      const y1 = source.y + NODE_HEIGHT;
      const x2 = target.x + NODE_WIDTH / 2;
      const y2 = target.y;
      const midY = (y1 + y2) / 2;

      const estW = edge.label.length * 7 + 20;
      const estH = 22;

      return { x: (x1 + x2) / 2, y: midY, w: estW, h: estH, text: edge.label, color: edgeColors[idx] };
    }).filter(Boolean) as { x: number; y: number; w: number; h: number; text: string; color: string }[];

    // Pass 1: nudge labels away from overlapping nodes
    for (const lbl of labels) {
      for (const l of layouts) {
        const nLeft = l.x - margin;
        const nRight = l.x + NODE_WIDTH + margin;
        const nTop = l.y - margin;
        const nBottom = l.y + NODE_HEIGHT + margin;

        const lLeft = lbl.x - lbl.w / 2;
        const lRight = lbl.x + lbl.w / 2;
        const lTop = lbl.y - lbl.h / 2;
        const lBottom = lbl.y + lbl.h / 2;

        if (lRight > nLeft && lLeft < nRight && lBottom > nTop && lTop < nBottom) {
          // Pick shorter displacement axis
          const pushRight = nRight + lbl.w / 2 + margin - lbl.x;
          const pushLeft = lbl.x - (nLeft - lbl.w / 2 - margin);
          const pushDown = nBottom + lbl.h / 2 + margin - lbl.y;
          const pushUp = lbl.y - (nTop - lbl.h / 2 - margin);
          const minH = Math.min(Math.abs(pushRight), Math.abs(pushLeft));
          const minV = Math.min(Math.abs(pushDown), Math.abs(pushUp));

          if (minH <= minV) {
            lbl.x += Math.abs(pushRight) < Math.abs(pushLeft) ? pushRight : -pushLeft;
          } else {
            lbl.y += Math.abs(pushDown) < Math.abs(pushUp) ? pushDown : -pushUp;
          }
        }
      }
    }

    // Pass 2: push overlapping labels apart (3 iterations)
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i];
          const b = labels[j];
          const overlapX = (a.w / 2 + b.w / 2 + margin) - Math.abs(a.x - b.x);
          const overlapY = (a.h / 2 + b.h / 2 + margin) - Math.abs(a.y - b.y);
          if (overlapX > 0 && overlapY > 0) {
            // Push apart along axis of least overlap
            if (overlapX < overlapY) {
              const shift = overlapX / 2;
              if (a.x < b.x) { a.x -= shift; b.x += shift; }
              else { a.x += shift; b.x -= shift; }
            } else {
              const shift = overlapY / 2;
              if (a.y < b.y) { a.y -= shift; b.y += shift; }
              else { a.y += shift; b.y -= shift; }
            }
          }
        }
      }
    }

    return labels;
  }, [tree.edges, layoutMap, layouts, edgeColors]);

  const maxX = Math.max(...layouts.map((l) => l.x + NODE_WIDTH)) + PADDING;
  const maxY = Math.max(...layouts.map((l) => l.y + NODE_HEIGHT)) + PADDING;

  // Pan handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only pan on background clicks (not on nodes/detail card)
    if ((e.target as HTMLElement).closest("[data-node], [data-detail]")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panOrigin.current = { ...pan };
    containerRef.current?.setPointerCapture(e.pointerId);
  }, [pan]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setPan({
      x: panOrigin.current.x + (e.clientX - panStart.current.x),
      y: panOrigin.current.y + (e.clientY - panStart.current.y),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Non-passive wheel listener so preventDefault() works (React onWheel is passive)
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const curZoom = zoomRef.current;
      const curPan = panRef.current;
      const newZoom = Math.max(0.1, Math.min(3, curZoom * delta));
      setPan({
        x: mouseX - (mouseX - curPan.x) * (newZoom / curZoom),
        y: mouseY - (mouseY - curPan.y) * (newZoom / curZoom),
      });
      setZoom(newZoom);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const selectedLayout = selectedNode ? layoutMap.get(selectedNode.id) : null;

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-gray-50/50"
      style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: maxX,
          height: maxY,
        }}
      >
        {/* SVG for edges only */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={maxX}
          height={maxY}
        >
          {tree.edges.map((edge, i) => {
            const source = layoutMap.get(edge.source);
            const target = layoutMap.get(edge.target);
            if (!source || !target) return null;

            const x1 = source.x + NODE_WIDTH / 2;
            const y1 = source.y + NODE_HEIGHT;
            const x2 = target.x + NODE_WIDTH / 2;
            const y2 = target.y;
            const midY = (y1 + y2) / 2;

            return (
              <path
                key={`edge-${i}`}
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke={edgeColors[i]}
                strokeWidth="2"
                strokeOpacity={0.7}
              />
            );
          })}
        </svg>

        {/* Node cards as HTML divs */}
        {layouts.map((layout) => {
          const { node, x, y } = layout;
          const isRoot = node.id === tree.root;
          const isSelected = selectedNode?.id === node.id;
          const isHighlighted = highlightPaperId === node.id;
          const color = RELATIONSHIP_COLORS[node.relationship] ?? "#6b7280";

          return (
            <div
              key={node.id}
              data-node
              className="absolute cursor-pointer select-none rounded-lg border"
              style={{
                left: x,
                top: y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                backgroundColor: isRoot ? "#000" : "#fff",
                borderColor: isHighlighted
                  ? "#3b82f6"
                  : isSelected
                    ? "#000"
                    : "#e5e7eb",
                borderWidth: isHighlighted ? 3 : isSelected ? 2 : 1,
                zIndex: 10,
              }}
              onClick={() => setSelectedNode(isSelected ? null : node)}
            >
              {/* Color bar */}
              <div
                className="absolute left-0 top-0 h-full w-1 rounded-l"
                style={{ backgroundColor: color }}
              />
              <div className="pl-3.5 pr-2 pt-2.5">
                <p
                  className="text-xs font-semibold leading-snug"
                  style={{ color: isRoot ? "#fff" : "#111" }}
                >
                  {truncateText(node.title, 40)}
                </p>
                <p
                  className="mt-0.5 text-[11px]"
                  style={{ color: isRoot ? "#a1a1aa" : "#9ca3af" }}
                >
                  {node.year > 0 ? node.year : ""}
                </p>
              </div>
            </div>
          );
        })}

        {/* Edge labels — rendered after nodes so they always appear on top */}
        {edgeLabels.map((lbl, i) => (
          <div
            key={`label-${i}`}
            className="absolute pointer-events-none select-none whitespace-nowrap rounded-full border bg-white px-2.5 py-0.5 text-[11px] font-medium shadow-sm"
            style={{
              left: lbl.x,
              top: lbl.y,
              transform: "translate(-50%, -50%)",
              zIndex: 15,
              borderColor: lbl.color,
              color: lbl.color,
            }}
          >
            {lbl.text}
          </div>
        ))}

        {/* Detail popover */}
        {selectedNode && selectedLayout && (
          <div
            data-detail
            className="absolute z-20 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
            style={{
              left: selectedLayout.x,
              top: selectedLayout.y + NODE_HEIGHT + 10,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold leading-snug text-gray-900">
                {selectedNode.title}
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
            {selectedNode.authors && (
              <p className="mt-1 text-xs text-gray-400">{selectedNode.authors}</p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              {selectedNode.relevance}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                style={{
                  backgroundColor:
                    RELATIONSHIP_COLORS[selectedNode.relationship] ?? "#6b7280",
                }}
              >
                {selectedNode.relationship}
              </span>
              {selectedNode.year > 0 && (
                <span className="text-xs text-gray-400">{selectedNode.year}</span>
              )}
              <a
                href={`/abs/${selectedNode.id}`}
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

      {/* Zoom buttons */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
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
    </div>
  );
}
