"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { ResearchTree, TreeNode } from "@/lib/research-tree";

const RELATIONSHIP_COLORS: Record<string, string> = {
  foundational: "#3b82f6",
  extends: "#22c55e",
  alternative: "#f97316",
  applies: "#8b5cf6",
  successor: "#06b6d4",
};

const NODE_WIDTH = 300;
const NODE_HEIGHT = 56;
const ROW_GAP = 120;
const COL_GAP = 48;
const PADDING = 32;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

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
  const svgWidth = Math.max(maxX, 360);
  const svgHeight = maxY;

  // Position the popover in DOM coordinates relative to the container
  const updatePopoverPos = useCallback(() => {
    if (!selectedNode || !svgRef.current || !containerRef.current) {
      setPopoverPos(null);
      return;
    }
    const layout = layoutMap.get(selectedNode.id);
    if (!layout) { setPopoverPos(null); return; }

    const svgEl = svgRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();
    const svgRect = svgEl.getBoundingClientRect();

    // Scale factor: rendered size vs viewBox
    const scale = svgRect.width / svgWidth;

    const top = svgRect.top - containerRect.top + (layout.y + NODE_HEIGHT + 8) * scale;
    const left = svgRect.left - containerRect.left + layout.x * scale;

    setPopoverPos({ top, left });
  }, [selectedNode, layoutMap, svgWidth]);

  useEffect(() => {
    updatePopoverPos();
  }, [updatePopoverPos]);

  // Recalculate on resize
  useEffect(() => {
    window.addEventListener("resize", updatePopoverPos);
    return () => window.removeEventListener("resize", updatePopoverPos);
  }, [updatePopoverPos]);

  return (
    <div ref={containerRef} className="relative p-4">
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="overflow-visible"
      >
        {/* Edges */}
        {tree.edges.map((edge, i) => {
          const source = layoutMap.get(edge.source);
          const target = layoutMap.get(edge.target);
          if (!source || !target) return null;

          const x1 = source.x + NODE_WIDTH / 2;
          const y1 = source.y + NODE_HEIGHT;
          const x2 = target.x + NODE_WIDTH / 2;
          const y2 = target.y;

          const cy = (y1 + y2) / 2;

          // Place label at the midpoint of the curve, offset slightly so it doesn't sit on the line
          const labelX = (x1 + x2) / 2 + (x1 === x2 ? 0 : 0);
          const labelY = cy + 2;

          return (
            <g key={`edge-${i}`}>
              <path
                d={`M ${x1} ${y1} Q ${x1} ${cy}, ${x2} ${y2}`}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="1.5"
              />
              {/* Label background pill */}
              <rect
                x={labelX - edge.label.length * 3 - 6}
                y={labelY - 8}
                width={edge.label.length * 6 + 12}
                height={16}
                rx={8}
                fill="white"
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={labelX}
                y={labelY + 3}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="11"
                fontWeight="500"
              >
                {edge.label}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {layouts.map((layout) => {
          const { node, x, y } = layout;
          const isRoot = node.id === tree.root;
          const isSelected = selectedNode?.id === node.id;
          const isHighlighted = highlightPaperId === node.id;
          const color = RELATIONSHIP_COLORS[node.relationship] ?? "#6b7280";

          return (
            <g
              key={node.id}
              onClick={() => {
                setSelectedNode(isSelected ? null : node);
              }}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill={isRoot ? "#000" : "#fff"}
                stroke={isHighlighted ? "#3b82f6" : isSelected ? "#000" : "#e5e7eb"}
                strokeWidth={isHighlighted ? 3 : isSelected ? 2 : 1}
              />
              {/* Relationship color bar */}
              <rect
                x={x}
                y={y}
                width={4}
                height={NODE_HEIGHT}
                rx={2}
                fill={color}
              />
              {/* Title */}
              <text
                x={x + 14}
                y={y + 23}
                fontSize="12"
                fontWeight="600"
                fill={isRoot ? "#fff" : "#111"}
                className="select-none"
              >
                {truncateText(node.title, 36)}
              </text>
              {/* Year */}
              <text
                x={x + 14}
                y={y + 42}
                fontSize="11"
                fill={isRoot ? "#a1a1aa" : "#9ca3af"}
                className="select-none"
              >
                {node.year > 0 ? node.year : ""}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Detail popover — rendered as HTML, auto-sizes to content */}
      {selectedNode && popoverPos && (
        <div
          className="absolute z-10 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
          style={{ top: popoverPos.top, left: popoverPos.left }}
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
  );
}
