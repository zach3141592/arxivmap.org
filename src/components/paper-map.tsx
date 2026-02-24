"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface MapNode {
  id: string;
  title: string;
  x: number;
  y: number;
}

interface MapEdge {
  source: string;
  target: string;
}

interface Paper {
  arxiv_id: string;
  title: string;
}

interface TreeData {
  root: string;
  nodes: { id: string; title: string }[];
  edges: { source: string; target: string }[];
}

function buildGraph(papers: Paper[], treeDataList: TreeData[]) {
  const nodeMap = new Map<string, MapNode>();

  // Add all user papers as nodes
  for (const p of papers) {
    nodeMap.set(p.arxiv_id, { id: p.arxiv_id, title: p.title, x: 0, y: 0 });
  }

  // Collect edges from trees — only between papers the user has saved
  const edgeSet = new Set<string>();
  const edges: MapEdge[] = [];
  for (const tree of treeDataList) {
    for (const e of tree.edges) {
      const key = [e.source, e.target].sort().join("--");
      if (!edgeSet.has(key) && nodeMap.has(e.source) && nodeMap.has(e.target)) {
        edgeSet.add(key);
        edges.push({ source: e.source, target: e.target });
      }
    }
  }

  const nodes = [...nodeMap.values()];
  const userPaperIds = new Set(papers.map((p) => p.arxiv_id));

  // Layout: simple force-directed positioning
  // Start with circular layout, then run a few iterations of force simulation
  const cx = 600;
  const cy = 400;
  const radius = Math.max(200, nodes.length * 25);

  for (let i = 0; i < nodes.length; i++) {
    const angle = (2 * Math.PI * i) / nodes.length;
    nodes[i].x = cx + radius * Math.cos(angle);
    nodes[i].y = cy + radius * Math.sin(angle);
  }

  // Simple force simulation
  const idxMap = new Map(nodes.map((n, i) => [n.id, i]));
  for (let iter = 0; iter < 100; iter++) {
    const forces = nodes.map(() => ({ fx: 0, fy: 0 }));

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const repulse = 50000 / (dist * dist);
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
      const attract = (dist - 180) * 0.01;
      dx /= dist;
      dy /= dist;
      forces[si].fx += dx * attract;
      forces[si].fy += dy * attract;
      forces[ti].fx -= dx * attract;
      forces[ti].fy -= dy * attract;
    }

    // Center gravity
    for (let i = 0; i < nodes.length; i++) {
      forces[i].fx += (cx - nodes[i].x) * 0.001;
      forces[i].fy += (cy - nodes[i].y) * 0.001;
    }

    // Apply forces
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x += Math.max(-10, Math.min(10, forces[i].fx));
      nodes[i].y += Math.max(-10, Math.min(10, forces[i].fy));
    }
  }

  return { nodes, edges, userPaperIds };
}

export function PaperMap({
  papers,
  treeDataList,
}: {
  papers: Paper[];
  treeDataList: TreeData[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { nodes, edges, userPaperIds } = buildGraph(papers, treeDataList);

  // Re-center graph on mount and when fullscreen toggles
  useEffect(() => {
    if (nodes.length === 0 || !containerRef.current) return;
    // Small delay so the container has its new dimensions after fullscreen toggle
    const frame = requestAnimationFrame(() => {
      const rect = containerRef.current!.getBoundingClientRect();
      const minX = Math.min(...nodes.map((n) => n.x));
      const maxX = Math.max(...nodes.map((n) => n.x));
      const minY = Math.min(...nodes.map((n) => n.y));
      const maxY = Math.max(...nodes.map((n) => n.y));
      const graphW = maxX - minX + 300;
      const graphH = maxY - minY + 200;
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

  // Find connected node IDs for hover highlighting
  const connectedToHovered = new Set<string>();
  if (hoveredNode) {
    connectedToHovered.add(hoveredNode);
    for (const e of edges) {
      if (e.source === hoveredNode) connectedToHovered.add(e.target);
      if (e.target === hoveredNode) connectedToHovered.add(e.source);
    }
  }

  const NODE_W = 200;
  const NODE_H = 44;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-50/40 ${
        isFullscreen
          ? "fixed inset-0 z-50 h-screen w-screen"
          : "h-[500px] rounded-2xl border border-gray-100"
      }`}
      style={{ cursor: dragging ? "grabbing" : "grab" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        className="h-full w-full"
        style={{ overflow: "visible" }}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {edges.map((e, i) => {
            const s = nodes.find((n) => n.id === e.source);
            const t = nodes.find((n) => n.id === e.target);
            if (!s || !t) return null;
            const dimmed = hoveredNode && (!connectedToHovered.has(s.id) || !connectedToHovered.has(t.id));
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={dimmed ? "#f0f0f0" : "#d4d4d4"}
                strokeWidth={1.5}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isUserPaper = userPaperIds.has(node.id);
            const isHovered = hoveredNode === node.id;
            const dimmed = hoveredNode && !connectedToHovered.has(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x - NODE_W / 2},${node.y - NODE_H / 2})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => {
                  window.location.href = `/abs/${node.id}`;
                }}
                style={{ cursor: "pointer" }}
                opacity={dimmed ? 0.25 : 1}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill={isHovered ? "#111" : isUserPaper ? "#fff" : "#fafafa"}
                  stroke={isHovered ? "#111" : isUserPaper ? "#e5e5e5" : "#f0f0f0"}
                  strokeWidth={1}
                />
                <text
                  x={NODE_W / 2}
                  y={18}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={500}
                  fill={isHovered ? "#fff" : "#333"}
                  style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
                >
                  {node.title.length > 28 ? node.title.slice(0, 28) + "..." : node.title}
                </text>
                <text
                  x={NODE_W / 2}
                  y={34}
                  textAnchor="middle"
                  fontSize={9}
                  fill={isHovered ? "#aaa" : "#999"}
                  style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Controls */}
      <div className="absolute bottom-3 right-3 flex gap-1">
        {!isFullscreen && (
          <button
            onClick={() => setIsFullscreen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm transition-colors hover:text-gray-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        )}
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
        <div className="absolute left-4 top-4 flex items-center gap-3">
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
      {isFullscreen && (
        <div className="absolute right-3 top-3">
          <button
            onClick={() => setIsFullscreen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm transition-colors hover:text-gray-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
