"use client";

import { useRef, useState, useMemo, Suspense, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import {
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

interface SelectedInfo {
  paper: Paper;
  topicIdx: number;
  position: THREE.Vector3;
}

/* ── Palette ── */

const PALETTE = [
  { hex: "#3b82f6", rgb: [0.23, 0.51, 0.96] as [number, number, number] },
  { hex: "#f59e0b", rgb: [0.96, 0.62, 0.04] as [number, number, number] },
  { hex: "#10b981", rgb: [0.06, 0.73, 0.51] as [number, number, number] },
  { hex: "#8b5cf6", rgb: [0.55, 0.36, 0.96] as [number, number, number] },
  { hex: "#ec4899", rgb: [0.93, 0.29, 0.60] as [number, number, number] },
  { hex: "#ef4444", rgb: [0.94, 0.27, 0.27] as [number, number, number] },
  { hex: "#eab308", rgb: [0.92, 0.70, 0.03] as [number, number, number] },
  { hex: "#06b6d4", rgb: [0.02, 0.71, 0.83] as [number, number, number] },
];

/* ── Helpers ── */

function firstAuthor(authors?: string): string {
  if (!authors) return "";
  const first = authors.split(",")[0].trim();
  return authors.includes(",") ? `${first} et al.` : first;
}

const SCALE = 0.006; // convert layout px → Three.js units

/* ── Hub sphere ── */

function HubSphere({ position, color }: { position: THREE.Vector3; color: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (glowRef.current) {
      glowRef.current.rotation.y += delta * 0.4;
      glowRef.current.rotation.x += delta * 0.2;
    }
  });

  return (
    <group position={position}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={new THREE.Color(...color)} transparent opacity={0.12} />
      </mesh>
      {/* Core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial
          color={new THREE.Color(...color)}
          emissive={new THREE.Color(...color)}
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>
    </group>
  );
}

/* ── Paper node card ── */

function PaperNode({
  paper,
  position,
  color,
  topicIdx,
  onSelect,
}: {
  paper: Paper;
  position: THREE.Vector3;
  color: { hex: string; rgb: [number, number, number] };
  topicIdx: number;
  onSelect: (info: SelectedInfo) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        hovered ? 0.6 : 0.05,
        0.12
      );
    }
  });

  const author = firstAuthor(paper.authors);

  return (
    <group
      position={position}
      onPointerEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = "auto"; }}
      onClick={(e) => { e.stopPropagation(); onSelect({ paper, topicIdx, position }); }}
    >
      {/* Card plane */}
      <mesh ref={meshRef}>
        <planeGeometry args={[1.0, 0.32]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={new THREE.Color(...color.rgb)}
          emissiveIntensity={0.05}
          roughness={0.8}
          metalness={0}
          transparent
          opacity={hovered ? 1 : 0.92}
        />
      </mesh>
      {/* Border outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(1.0, 0.32)]} />
        <lineBasicMaterial color={color.hex} transparent opacity={hovered ? 0.9 : 0.45} />
      </lineSegments>
      {/* HTML label */}
      <Html
        center
        style={{ pointerEvents: "none", width: 110, userSelect: "none" }}
        distanceFactor={6}
      >
        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
          <div style={{
            fontSize: 9,
            fontWeight: 600,
            color: "#1f2937",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            fontFamily: "system-ui, sans-serif",
          }}>
            {paper.title}
          </div>
          {author && (
            <div style={{
              fontSize: 8,
              color: "#9ca3af",
              marginTop: 2,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              fontFamily: "system-ui, sans-serif",
            }}>
              {author}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

/* ── Topic cluster ── */

function TopicCluster({
  circle,
  ci,
  zOffset,
  onSelect,
}: {
  circle: ReturnType<typeof packCircles>[0];
  ci: number;
  zOffset: number;
  onSelect: (info: SelectedInfo) => void;
}) {
  const color = PALETTE[ci % PALETTE.length];
  const hubPos = new THREE.Vector3(circle.cx * SCALE, -circle.cy * SCALE, zOffset);

  const spokes = useMemo(() => {
    return circle.papers.map((_, i) => {
      const pos = circle.cardPositions[i];
      if (!pos) return null;
      const x = (circle.cx + pos.x) * SCALE;
      const y = -(circle.cy + pos.y) * SCALE;
      const z = zOffset;
      return new THREE.Vector3(x, y, z);
    });
  }, [circle, zOffset]);

  return (
    <group>
      {/* Hub sphere */}
      <HubSphere position={hubPos} color={color.rgb} />

      {/* Hub label */}
      <Html position={hubPos.clone().add(new THREE.Vector3(0, 0.22, 0))} center distanceFactor={5}>
        <div style={{
          background: "rgba(255,255,255,0.92)",
          border: `1px solid ${color.hex}`,
          borderRadius: 20,
          padding: "2px 8px",
          fontSize: 8,
          fontWeight: 700,
          color: color.hex,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          fontFamily: "system-ui, sans-serif",
          pointerEvents: "none",
          userSelect: "none",
        }}>
          {circle.topic.label}
        </div>
      </Html>

      {/* Spoke lines */}
      {spokes.map((nodePos, i) => {
        if (!nodePos) return null;
        return (
          <Line
            key={i}
            points={[hubPos, nodePos]}
            color={color.hex}
            lineWidth={0.8}
            transparent
            opacity={0.2}
          />
        );
      })}

      {/* Paper nodes */}
      {circle.papers.map((paper, i) => {
        const nodePos = spokes[i];
        if (!nodePos) return null;
        return (
          <PaperNode
            key={paper.arxiv_id}
            paper={paper}
            position={nodePos}
            color={color}
            topicIdx={ci}
            onSelect={onSelect}
          />
        );
      })}
    </group>
  );
}

/* ── Detail popover (HTML overlay) ── */

function DetailPopover({
  info,
  onClose,
}: {
  info: SelectedInfo;
  onClose: () => void;
}) {
  const color = PALETTE[info.topicIdx % PALETTE.length];

  // Project 3D position to screen
  return (
    <Html
      position={info.position.clone().add(new THREE.Vector3(0, -0.25, 0))}
      center
      style={{ pointerEvents: "all" }}
      distanceFactor={4}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "14px 16px",
          width: 220,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9ca3af",
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", lineHeight: 1.4, paddingRight: 16 }}>
          {info.paper.title}
        </div>
        {info.paper.authors && (
          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
            {info.paper.authors}
          </div>
        )}
        <a
          href={`/abs/${info.paper.arxiv_id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginTop: 10,
            fontSize: 11,
            fontWeight: 600,
            color: color.hex,
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          View paper →
        </a>
      </div>
    </Html>
  );
}

/* ── Scene ── */

function Scene({
  circles,
}: {
  circles: ReturnType<typeof packCircles>;
}) {
  const [selected, setSelected] = useState<SelectedInfo | null>(null);
  const { gl } = useThree();

  // Z offsets to give clusters depth
  const zOffsets = useMemo(() =>
    circles.map((_, i) => {
      const seed = i * 2.3 + 0.7;
      return (Math.sin(seed) * 0.5 + Math.cos(seed * 1.7) * 0.3) * 2.5;
    }),
  [circles]);

  useEffect(() => {
    const handleClick = () => setSelected(null);
    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [gl]);

  return (
    <>
      <color attach="background" args={["#f8fafc"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 10, 7]} intensity={0.8} />
      <pointLight position={[-5, -5, 5]} intensity={0.4} color="#e0e7ff" />

      {circles.map((circle, ci) => (
        <TopicCluster
          key={circle.topic.label}
          circle={circle}
          ci={ci}
          zOffset={zOffsets[ci]}
          onSelect={(info) => { setSelected(info); }}
        />
      ))}

      {selected && (
        <DetailPopover
          info={selected}
          onClose={() => setSelected(null)}
        />
      )}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={1}
        maxDistance={40}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
        panSpeed={0.8}
        makeDefault
      />
    </>
  );
}

/* ── Main component ── */

export function PaperMap({
  papers,
  cachedMap,
}: {
  papers: Paper[];
  cachedMap?: StoredMapData | null;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(380);
  const chatDragRef = useRef(false);
  const chatDragStartX = useRef(0);
  const chatDragStartW = useRef(380);

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
      topic: { label: "Papers", keywords: [], fill: "#e5e7eb", stroke: "none", text: "#6b7280" },
      papers,
      r,
      cardPositions: positions,
    }]);
  }, [cachedMap, papers]);

  const chatContext = useMemo(() => {
    const total = circles.reduce((s, c) => s + c.papers.length, 0);
    let ctx = `Paper map with ${total} papers across ${circles.length} topics:\n`;
    for (const c of circles) {
      ctx += `\nTopic: "${c.topic.label}"\n`;
      for (const p of c.papers) ctx += `- "${p.title}" (${p.arxiv_id})\n`;
    }
    return ctx;
  }, [circles]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!chatDragRef.current) return;
      const w = Math.min(700, Math.max(280, chatDragStartW.current + (chatDragStartX.current - e.clientX)));
      setChatWidth(w);
    };
    const onUp = () => { chatDragRef.current = false; };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
  }, []);

  if (papers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <p className="text-sm text-gray-400">No papers yet. Save papers to build your research map.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f8fafc]">
      {/* Three.js canvas */}
      <div style={{ position: "absolute", inset: 0, right: chatOpen ? chatWidth : 0 }}>
        <Canvas
          camera={{ position: [0, 0, 12], fov: 55, near: 0.1, far: 200 }}
          dpr={[1, 2]}
          style={{ background: "#f8fafc" }}
        >
          <Suspense fallback={null}>
            <Scene circles={circles} />
          </Suspense>
        </Canvas>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div
          className="absolute right-0 top-0 h-full border-l border-gray-200 bg-white"
          style={{ width: chatWidth, zIndex: 20 }}
        >
          {/* Drag handle */}
          <div
            className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-200 transition-colors"
            style={{ zIndex: 21 }}
            onPointerDown={(e) => {
              e.preventDefault();
              chatDragRef.current = true;
              chatDragStartX.current = e.clientX;
              chatDragStartW.current = chatWidth;
            }}
          />
          <ChatPanel abstract={chatContext} contextId="map" />
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2" style={{ zIndex: 10 }}>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-all ${
            chatOpen
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat
        </button>
        <span className="text-[10px] text-gray-400">Drag to rotate · Scroll to zoom · Right-drag to pan</span>
      </div>
    </div>
  );
}
