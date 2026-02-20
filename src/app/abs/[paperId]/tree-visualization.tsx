"use client";

import { useState, useMemo } from "react";
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
const ROW_GAP = 80;
const COL_GAP = 24;
const PADDING = 24;

interface LayoutNode {
  node: TreeNode;
  x: number;
  y: number;
}

function layoutNodes(tree: ResearchTree): LayoutNode[] {
  const root = tree.nodes.find((n) => n.id === tree.root);
  const others = tree.nodes.filter((n) => n.id !== tree.root);

  // Group by generation: foundational papers above, extensions/successors below
  const above: TreeNode[] = [];
  const below: TreeNode[] = [];

  for (const node of others) {
    if (node.relationship === "foundational") {
      above.push(node);
    } else {
      below.push(node);
    }
  }

  // Sort by year within each group
  above.sort((a, b) => a.year - b.year);
  below.sort((a, b) => a.year - b.year);

  const layouts: LayoutNode[] = [];

  // Layout above rows (foundational papers)
  const aboveRows = chunkNodes(above, 2);
  for (let rowIdx = 0; rowIdx < aboveRows.length; rowIdx++) {
    const row = aboveRows[rowIdx];
    const rowY = PADDING + rowIdx * (NODE_HEIGHT + ROW_GAP);
    layoutRow(row, rowY, layouts);
  }

  // Root row
  const rootY =
    PADDING + aboveRows.length * (NODE_HEIGHT + ROW_GAP);
  if (root) {
    layouts.push({
      node: root,
      x: PADDING + (NODE_WIDTH + COL_GAP) * 0.5 - NODE_WIDTH / 2 + NODE_WIDTH / 2,
      y: rootY,
    });
    // Center root
    layouts[layouts.length - 1].x = PADDING;
  }

  // Layout below rows (extensions, alternatives, etc.)
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

export function TreeVisualization({ tree }: { tree: ResearchTree }) {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const layouts = useMemo(() => layoutNodes(tree), [tree]);

  const layoutMap = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    for (const l of layouts) {
      map.set(l.node.id, l);
    }
    return map;
  }, [layouts]);

  // Calculate SVG dimensions
  const maxX = Math.max(...layouts.map((l) => l.x + NODE_WIDTH)) + PADDING;
  const maxY = Math.max(...layouts.map((l) => l.y + NODE_HEIGHT)) + PADDING;
  const svgWidth = Math.max(maxX, 360);
  const svgHeight = maxY + (selectedNode ? 200 : 0);

  return (
    <div className="p-4">
      <svg
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

          // Quadratic Bezier
          const cy = (y1 + y2) / 2;

          return (
            <g key={`edge-${i}`}>
              <path
                d={`M ${x1} ${y1} Q ${x1} ${cy}, ${x2} ${y2}`}
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1.5"
              />
              {/* Edge label */}
              <text
                x={(x1 + x2) / 2}
                y={cy}
                textAnchor="middle"
                className="fill-gray-400"
                fontSize="9"
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
          const color = RELATIONSHIP_COLORS[node.relationship] ?? "#6b7280";

          return (
            <g
              key={node.id}
              onClick={() =>
                setSelectedNode(isSelected ? null : node)
              }
              className="cursor-pointer"
            >
              {/* Card background */}
              <rect
                x={x}
                y={y}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill={isRoot ? "#000" : "#fff"}
                stroke={isSelected ? "#000" : "#e5e7eb"}
                strokeWidth={isSelected ? 2 : 1}
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
                y={y + 24}
                fontSize="12"
                fontWeight="600"
                fill={isRoot ? "#fff" : "#111"}
                className="select-none"
              >
                {truncateText(node.title, 38)}
              </text>
              {/* Year */}
              <text
                x={x + 14}
                y={y + 44}
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

      {/* Detail card */}
      {selectedNode && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-snug text-gray-900">
              {selectedNode.title}
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg
                width="16"
                height="16"
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
          <div className="mt-3 flex items-center gap-3">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{
                backgroundColor:
                  RELATIONSHIP_COLORS[selectedNode.relationship] ?? "#6b7280",
              }}
            >
              {selectedNode.relationship}
            </span>
            {selectedNode.year > 0 && (
              <span className="text-xs text-gray-400">
                {selectedNode.year}
              </span>
            )}
          </div>
          <a
            href={`/abs/${selectedNode.id}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-black hover:underline"
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
      )}
    </div>
  );
}
