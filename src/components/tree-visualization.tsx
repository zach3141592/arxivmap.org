"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { ResearchTree, TreeNode } from "@/lib/research-tree";

const RELATIONSHIP_COLORS: Record<string, string> = {
  foundational: "#f59e0b",
  extends: "#34d399",
  alternative: "#f87171",
  applies: "#a78bfa",
  successor: "#60a5fa",
};

// Theme
const GOLD = "#c9a84c";
const GOLD_BRIGHT = "#e6c96a";
const NODE_BG = "#13100a";
const ROOT_BG = "#1f1808";
const BG_COLOR = "#0c0a06";
const TEXT_PRIMARY = "#e8d5a3";
const TEXT_DIM = "#6b5c3e";

const NODE_WIDTH = 152;
const NODE_HEIGHT = 54;
const ROW_GAP = 76;
const COL_GAP = 16;
const PADDING = 60;
const NODES_PER_ROW = 4;

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

  const aboveRows = chunkNodes(above, NODES_PER_ROW);
  for (let rowIdx = 0; rowIdx < aboveRows.length; rowIdx++) {
    const row = aboveRows[rowIdx];
    const rowY = PADDING + rowIdx * (NODE_HEIGHT + ROW_GAP);
    layoutRow(row, rowY, layouts);
  }

  const rootY = PADDING + aboveRows.length * (NODE_HEIGHT + ROW_GAP);
  if (root) {
    layouts.push({ node: root, x: PADDING, y: rootY });
  }

  const belowRows = chunkNodes(below, NODES_PER_ROW);
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

  const maxX = Math.max(...layouts.map((l) => l.x + NODE_WIDTH)) + PADDING;
  const maxY = Math.max(...layouts.map((l) => l.y + NODE_HEIGHT)) + PADDING;

  // Glowing radial center position
  const centerX = maxX / 2;
  const centerY = maxY / 2;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
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
      className="h-full w-full overflow-hidden"
      style={{ backgroundColor: BG_COLOR, cursor: "grab" }}
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
        {/* Warm ambient glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: centerX - 400,
            top: centerY - 300,
            width: 800,
            height: 600,
            background: `radial-gradient(ellipse at center, rgba(180,120,30,0.18) 0%, rgba(160,100,20,0.08) 40%, transparent 70%)`,
            borderRadius: "50%",
          }}
        />

        {/* SVG: edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={maxX}
          height={maxY}
          style={{ filter: "drop-shadow(0 0 3px rgba(201,168,76,0.25))" }}
        >
          <defs>
            <filter id="edge-glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

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
                d={`M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`}
                fill="none"
                stroke={GOLD}
                strokeWidth="1.5"
                strokeOpacity={0.45}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Node cards */}
        {layouts.map((layout) => {
          const { node, x, y } = layout;
          const isRoot = node.id === tree.root;
          const isSelected = selectedNode?.id === node.id;
          const isHighlighted = highlightPaperId === node.id;
          const relColor = RELATIONSHIP_COLORS[node.relationship] ?? GOLD;

          const borderColor = isSelected
            ? GOLD_BRIGHT
            : isHighlighted
              ? "#60a5fa"
              : GOLD;
          const glowOpacity = isSelected ? 0.7 : isHighlighted ? 0.6 : 0.25;

          return (
            <div
              key={node.id}
              data-node
              className="absolute cursor-pointer select-none rounded-md"
              style={{
                left: x,
                top: y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                backgroundColor: isRoot ? ROOT_BG : NODE_BG,
                border: `1px solid ${borderColor}`,
                boxShadow: `0 0 10px rgba(201,168,76,${glowOpacity}), inset 0 0 0 1px rgba(201,168,76,0.06)`,
                zIndex: 10,
                transition: "box-shadow 0.15s ease, border-color 0.15s ease",
              }}
              onClick={() => setSelectedNode(isSelected ? null : node)}
            >
              <div className="flex h-full flex-col justify-center px-3">
                <p
                  className="text-[11px] font-semibold leading-snug"
                  style={{ color: isRoot ? GOLD_BRIGHT : TEXT_PRIMARY }}
                >
                  {truncateText(node.title, 28)}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: relColor, opacity: 0.8 }}
                  />
                  <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                    {node.year > 0 ? node.year : ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Detail popover */}
        {selectedNode && selectedLayout && (
          <div
            data-detail
            className="absolute z-20 w-64 rounded-xl p-4 shadow-2xl"
            style={{
              left: selectedLayout.x,
              top: selectedLayout.y + NODE_HEIGHT + 10,
              backgroundColor: "#1a1408",
              border: `1px solid rgba(201,168,76,0.4)`,
              boxShadow: `0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.1)`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-snug" style={{ color: TEXT_PRIMARY }}>
                {selectedNode.title}
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ color: TEXT_DIM }}
                className="shrink-0 hover:opacity-80"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {selectedNode.authors && (
              <p className="mt-1 text-[11px]" style={{ color: TEXT_DIM }}>
                {truncateText(selectedNode.authors, 50)}
              </p>
            )}
            <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "#9a8a6a" }}>
              {selectedNode.relevance}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: "rgba(201,168,76,0.12)",
                  border: "1px solid rgba(201,168,76,0.3)",
                  color: GOLD,
                }}
              >
                {selectedNode.relationship}
              </span>
              {selectedNode.year > 0 && (
                <span className="text-[11px]" style={{ color: TEXT_DIM }}>{selectedNode.year}</span>
              )}
              <a
                href={`/abs/${selectedNode.id}`}
                className="ml-auto text-[11px] font-medium transition-opacity hover:opacity-80"
                style={{ color: GOLD }}
              >
                View paper →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        {[
          { label: "+", action: () => setZoom(Math.min(3, zoom * 1.2)) },
          { label: "−", action: () => setZoom(Math.max(0.1, zoom * 0.8)) },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            className="h-7 w-7 rounded-md text-sm transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "#1a1408",
              border: `1px solid rgba(201,168,76,0.35)`,
              color: GOLD,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
