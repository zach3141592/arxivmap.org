"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import type { ResearchTree, TreeNode } from "@/lib/research-tree";

const RELATIONSHIP_COLORS: Record<string, string> = {
  foundational: "#3b82f6",
  extends: "#22c55e",
  alternative: "#f97316",
  applies: "#8b5cf6",
  successor: "#06b6d4",
};

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
          transform: `translate(${pan.x}px, ${pan.y}px)`,
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
            const cpY = (y1 + y2) / 2;

            return (
              <path
                key={`edge-${i}`}
                d={`M ${x1} ${y1} Q ${x1} ${cpY}, ${x2} ${y2}`}
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1.5"
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
        {tree.edges.map((edge, i) => {
          const source = layoutMap.get(edge.source);
          const target = layoutMap.get(edge.target);
          if (!source || !target) return null;

          const x1 = source.x + NODE_WIDTH / 2;
          const y1 = source.y + NODE_HEIGHT;
          const x2 = target.x + NODE_WIDTH / 2;
          const y2 = target.y;

          const cpX = x1;
          const cpY = (y1 + y2) / 2;
          const t = 0.5;
          const labelX = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cpX + t * t * x2;
          const labelY = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cpY + t * t * y2;

          return (
            <div
              key={`label-${i}`}
              className="absolute pointer-events-none select-none whitespace-nowrap rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-500 shadow-sm"
              style={{
                left: labelX,
                top: labelY,
                transform: "translate(-50%, -50%)",
                zIndex: 15,
              }}
            >
              {edge.label}
            </div>
          );
        })}

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
    </div>
  );
}
