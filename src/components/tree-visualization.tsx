"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { ResearchTree, TreeNode } from "@/lib/research-tree";

// ─── Theme ────────────────────────────────────────────────────────────────────
const GOLD        = "#c9a84c";
const GOLD_BRIGHT = "#e6c96a";
const NODE_BG     = "#13100a";
const ROOT_BG     = "#1f1808";
const BG_COLOR    = "#0c0a06";
const TEXT_CREAM  = "#e8d5a3";
const TEXT_DIM    = "#6b5c3e";

const RELATIONSHIP_COLORS: Record<string, string> = {
  foundational: "#f59e0b",
  extends:      "#34d399",
  alternative:  "#f87171",
  applies:      "#a78bfa",
  successor:    "#60a5fa",
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const NODE_W   = 116;
const NODE_H   = 42;
const COL_GAP  = 10;   // horizontal space between siblings
const ROW_GAP  = 72;   // vertical space between depth levels
const PADDING  = 60;

// ─── Tree layout algorithm ───────────────────────────────────────────────────
//
// 1. BFS from root using both forward edges (source→target, "down") and
//    backward edges (source→root, "up") to assign each node a depth and a
//    parent in the spanning tree.
// 2. Recursive post-order traversal: leaves get sequential x positions;
//    internal nodes are horizontally centred over their children.
// 3. y = (depth − minDepth) × row_pitch
//
// This produces an organic, branching layout where the root sits in the
// middle, foundational papers spread above it, and successors spread below —
// exactly like the PoE passive-skill tree.

interface Pos { x: number; y: number; }

function buildSpanningTree(tree: ResearchTree): {
  treeKids: Map<string, string[]>; // layoutchildren (up AND down)
  depthOf:  Map<string, number>;
} {
  // Build directed adjacency in both directions
  const fwd = new Map<string, string[]>(); // source → targets  (successors)
  const bwd = new Map<string, string[]>(); // target → sources  (foundational)
  for (const e of tree.edges) {
    if (!fwd.has(e.source)) fwd.set(e.source, []);
    fwd.get(e.source)!.push(e.target);
    if (!bwd.has(e.target)) bwd.set(e.target, []);
    bwd.get(e.target)!.push(e.source);
  }

  const treeKids = new Map<string, string[]>();
  const depthOf  = new Map<string, number>();
  const visited  = new Set<string>();

  const init = (id: string) => { if (!treeKids.has(id)) treeKids.set(id, []); };

  depthOf.set(tree.root, 0);
  visited.add(tree.root);
  init(tree.root);

  const queue: string[] = [tree.root];
  while (queue.length > 0) {
    const id    = queue.shift()!;
    const depth = depthOf.get(id)!;

    // Forward edges → children go DOWN (+1 depth)
    for (const next of fwd.get(id) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        init(next);
        depthOf.set(next, depth + 1);
        treeKids.get(id)!.push(next);
        queue.push(next);
      }
    }

    // Backward edges → sources go UP (−1 depth)
    for (const prev of bwd.get(id) ?? []) {
      if (!visited.has(prev)) {
        visited.add(prev);
        init(prev);
        depthOf.set(prev, depth - 1);
        treeKids.get(id)!.push(prev);
        queue.push(prev);
      }
    }
  }

  // Attach any disconnected nodes to root
  for (const node of tree.nodes) {
    if (!visited.has(node.id)) {
      init(node.id);
      const d = node.relationship === "foundational" ? -1 : 1;
      depthOf.set(node.id, d);
      treeKids.get(tree.root)!.push(node.id);
    }
  }

  return { treeKids, depthOf };
}

function computePositions(tree: ResearchTree): Map<string, Pos> {
  const { treeKids, depthOf } = buildSpanningTree(tree);
  const xOf        = new Map<string, number>();
  const leafCount   = { v: 0 };

  // Post-order DFS: leaves get sequential slots; parents centre over children
  function assignX(id: string): void {
    const kids = treeKids.get(id) ?? [];
    if (kids.length === 0) {
      xOf.set(id, leafCount.v++ * (NODE_W + COL_GAP));
      return;
    }
    for (const k of kids) assignX(k);
    const xs = kids.map((k) => xOf.get(k)!);
    xOf.set(id, (Math.min(...xs) + Math.max(...xs)) / 2);
  }

  assignX(tree.root);

  const minDepth = Math.min(...Array.from(depthOf.values()));
  const positions = new Map<string, Pos>();
  for (const [id, depth] of depthOf) {
    positions.set(id, {
      x: (xOf.get(id) ?? 0) + PADDING,
      y: (depth - minDepth) * (NODE_H + ROW_GAP) + PADDING,
    });
  }
  return positions;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function trunc(text: string, max: number) {
  return text.length <= max ? text : text.slice(0, max - 1) + "\u2026";
}

// ─── Component ───────────────────────────────────────────────────────────────
export function TreeVisualization({
  tree,
  highlightPaperId,
}: {
  tree: ResearchTree;
  highlightPaperId?: string;
}) {
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [pan,      setPan]      = useState({ x: 0, y: 0 });
  const [zoom,     setZoom]     = useState(0.9);
  const isPanning  = useRef(false);
  const panStart   = useRef({ x: 0, y: 0 });
  const panOrigin  = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const nodeMap  = useMemo(() => new Map(tree.nodes.map((n) => [n.id, n])), [tree]);
  const positions = useMemo(() => computePositions(tree), [tree]);

  const allX = Array.from(positions.values()).map((p) => p.x);
  const allY = Array.from(positions.values()).map((p) => p.y);
  const canvasW = Math.max(...allX) + NODE_W + PADDING;
  const canvasH = Math.max(...allY) + NODE_H + PADDING;

  // Auto-centre on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setPan({
      x: (el.clientWidth  - canvasW * zoom) / 2,
      y: (el.clientHeight - canvasH * zoom) / 2,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasW, canvasH]);

  // Pan handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-node],[data-detail]")) return;
    isPanning.current = true;
    panStart.current  = { x: e.clientX, y: e.clientY };
    panOrigin.current = { ...pan };
    containerRef.current?.setPointerCapture(e.pointerId);
  }, [pan]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setPan({
      x: panOrigin.current.x + e.clientX - panStart.current.x,
      y: panOrigin.current.y + e.clientY - panStart.current.y,
    });
  }, []);

  const onPointerUp = useCallback(() => { isPanning.current = false; }, []);

  // Mouse-centred zoom (non-passive wheel)
  const zoomRef = useRef(zoom);
  const panRef  = useRef(pan);
  zoomRef.current = zoom;
  panRef.current  = pan;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect   = el.getBoundingClientRect();
      const mx     = e.clientX - rect.left;
      const my     = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const cz     = zoomRef.current;
      const cp     = panRef.current;
      const nz     = Math.max(0.1, Math.min(4, cz * factor));
      setPan({ x: mx - (mx - cp.x) * (nz / cz), y: my - (my - cp.y) * (nz / cz) });
      setZoom(nz);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const selPos = selected ? positions.get(selected.id) : null;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ backgroundColor: BG_COLOR, cursor: "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* ── Zoomed / panned canvas ── */}
      <div
        className="absolute"
        style={{
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: canvasW,
          height: canvasH,
        }}
      >
        {/* Warm amber glow at tree centre */}
        <div
          className="pointer-events-none absolute"
          style={{
            left:   canvasW / 2 - 500,
            top:    canvasH / 2 - 360,
            width:  1000,
            height: 720,
            background:
              "radial-gradient(ellipse at center, rgba(180,120,30,0.16) 0%, rgba(150,90,15,0.07) 45%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* ── Edges (SVG) ── */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={canvasW}
          height={canvasH}
        >
          {tree.edges.map((edge, i) => {
            const sp = positions.get(edge.source);
            const tp = positions.get(edge.target);
            if (!sp || !tp) return null;

            // Connect whichever end is closer to the other node
            let x1: number, y1: number, x2: number, y2: number;
            if (sp.y <= tp.y) {
              // source above target
              x1 = sp.x + NODE_W / 2;  y1 = sp.y + NODE_H;
              x2 = tp.x + NODE_W / 2;  y2 = tp.y;
            } else {
              // source below target
              x1 = sp.x + NODE_W / 2;  y1 = sp.y;
              x2 = tp.x + NODE_W / 2;  y2 = tp.y + NODE_H;
            }
            const midY = (y1 + y2) / 2;

            return (
              <path
                key={i}
                d={`M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`}
                fill="none"
                stroke={GOLD}
                strokeWidth="1.5"
                strokeOpacity={0.4}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* ── Nodes ── */}
        {Array.from(positions.entries()).map(([id, pos]) => {
          const node        = nodeMap.get(id);
          if (!node) return null;
          const isRoot      = id === tree.root;
          const isSelected  = selected?.id === id;
          const isHighlight = highlightPaperId === id;
          const relColor    = RELATIONSHIP_COLORS[node.relationship] ?? GOLD;

          const borderColor  = isSelected ? GOLD_BRIGHT : isHighlight ? "#60a5fa" : GOLD;
          const glowAlpha    = isSelected ? 0.75 : isHighlight ? 0.65 : 0.22;

          return (
            <div
              key={id}
              data-node
              className="absolute cursor-pointer select-none rounded-md"
              style={{
                left:            pos.x,
                top:             pos.y,
                width:           NODE_W,
                height:          NODE_H,
                backgroundColor: isRoot ? ROOT_BG : NODE_BG,
                border:          `1px solid ${borderColor}`,
                boxShadow:       `0 0 10px rgba(201,168,76,${glowAlpha}), inset 0 0 0 1px rgba(201,168,76,0.05)`,
                zIndex:          10,
                transition:      "box-shadow 0.15s, border-color 0.15s",
              }}
              onClick={() => setSelected(isSelected ? null : node)}
            >
              <div className="flex h-full flex-col justify-center px-2.5">
                <p
                  className="text-[10.5px] font-semibold leading-snug"
                  style={{ color: isRoot ? GOLD_BRIGHT : TEXT_CREAM }}
                >
                  {trunc(node.title, 24)}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: relColor, opacity: 0.8 }}
                  />
                  <p className="text-[9.5px]" style={{ color: TEXT_DIM }}>
                    {node.year > 0 ? node.year : ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Detail popover ── */}
        {selected && selPos && (
          <div
            data-detail
            className="absolute z-20 w-60 rounded-xl p-4 shadow-2xl"
            style={{
              left:            selPos.x,
              top:             selPos.y + NODE_H + 10,
              backgroundColor: "#1a1408",
              border:          "1px solid rgba(201,168,76,0.4)",
              boxShadow:       "0 0 24px rgba(0,0,0,0.85), 0 0 40px rgba(201,168,76,0.08)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3
                className="text-sm font-semibold leading-snug"
                style={{ color: TEXT_CREAM }}
              >
                {selected.title}
              </h3>
              <button
                onClick={() => setSelected(null)}
                style={{ color: TEXT_DIM }}
                className="shrink-0 hover:opacity-70"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6"  x2="6"  y2="18" />
                  <line x1="6"  y1="6"  x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {selected.authors && (
              <p className="mt-1 text-[11px]" style={{ color: TEXT_DIM }}>
                {trunc(selected.authors, 48)}
              </p>
            )}

            <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "#9a8a6a" }}>
              {selected.relevance}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: "rgba(201,168,76,0.1)",
                  border:          "1px solid rgba(201,168,76,0.3)",
                  color:           GOLD,
                }}
              >
                {selected.relationship}
              </span>
              {selected.year > 0 && (
                <span className="text-[11px]" style={{ color: TEXT_DIM }}>
                  {selected.year}
                </span>
              )}
              <a
                href={`/abs/${selected.id}`}
                className="ml-auto text-[11px] font-medium transition-opacity hover:opacity-75"
                style={{ color: GOLD }}
              >
                View →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Zoom controls ── */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        {(["+", "−"] as const).map((label) => (
          <button
            key={label}
            onClick={() =>
              setZoom((z) =>
                label === "+" ? Math.min(4, z * 1.2) : Math.max(0.1, z * 0.8)
              )
            }
            className="h-7 w-7 rounded-md text-sm transition-opacity hover:opacity-75"
            style={{
              backgroundColor: "#1a1408",
              border:          "1px solid rgba(201,168,76,0.35)",
              color:           GOLD,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
