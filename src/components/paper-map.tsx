"use client";

import { useRef, useState, useMemo, Suspense, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Text, OrbitControls, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { radialPositions, blobRadius, packCircles } from "@/lib/map-layout";
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

/* ── Color palette (dark, readable on white) ── */

const PALETTE = [
  { hex: "#2563eb" },
  { hex: "#d97706" },
  { hex: "#059669" },
  { hex: "#7c3aed" },
  { hex: "#db2777" },
  { hex: "#dc2626" },
  { hex: "#ca8a04" },
  { hex: "#0284c7" },
];

const SCALE = 0.004;

function firstAuthor(authors?: string): string {
  if (!authors) return "";
  const first = authors.split(",")[0].trim();
  return authors.includes(",") ? `${first} et al.` : first;
}

/* ── Paper sphere ── */

function PaperNode({
  paper,
  position,
  color,
  topicIdx,
  onSelect,
}: {
  paper: Paper;
  position: THREE.Vector3;
  color: string;
  topicIdx: number;
  onSelect: (info: SelectedInfo) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, hovered ? 1.0 : 0.2, 0.12);
    const s = THREE.MathUtils.lerp(meshRef.current.scale.x, hovered ? 1.3 : 1.0, 0.12);
    meshRef.current.scale.setScalar(s);
  });

  const label = paper.title.length > 32 ? paper.title.slice(0, 32) + "…" : paper.title;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = "auto"; }}
        onClick={(e) => { e.stopPropagation(); onSelect({ paper, topicIdx, position }); }}
      >
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>
      <Billboard>
        <Text
          position={[0.2, 0.02, 0]}
          fontSize={0.1}
          color="#1f2937"
          anchorX="left"
          anchorY="middle"
          maxWidth={2.0}
          outlineWidth={0.008}
          outlineColor="white"
          fontWeight={600}
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

/* ── Hub cube ── */

function HubNode({
  label,
  position,
  color,
}: {
  label: string;
  position: THREE.Vector3;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.35;
      meshRef.current.rotation.x += delta * 0.15;
    }
  });

  return (
    <group position={position}>
      {/* Soft outer glow */}
      <mesh>
        <boxGeometry args={[0.58, 0.58, 0.58]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>
      {/* Main cube */}
      <mesh
        ref={meshRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.35}
          emissive={color}
          emissiveIntensity={hovered ? 0.55 : 0.25}
        />
      </mesh>
      {/* Label */}
      <Billboard>
        <Text
          position={[0.35, 0.08, 0]}
          fontSize={0.21}
          color="#111827"
          anchorX="left"
          anchorY="middle"
          outlineWidth={0.014}
          outlineColor="white"
          fontWeight={700}
        >
          {label}
        </Text>
      </Billboard>
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
  const color = PALETTE[ci % PALETTE.length].hex;
  const hubPos = useMemo(
    () => new THREE.Vector3(circle.cx * SCALE, -circle.cy * SCALE, zOffset),
    [circle.cx, circle.cy, zOffset]
  );

  const paperPositions = useMemo(
    () =>
      circle.papers.map((_, i) => {
        const pos = circle.cardPositions[i];
        if (!pos) return null;
        const angleNoise = (i * 137.508 * Math.PI) / 180;
        const zNoise = Math.sin(angleNoise + ci) * 0.8;
        return new THREE.Vector3(
          (circle.cx + pos.x) * SCALE,
          -(circle.cy + pos.y) * SCALE,
          zOffset + zNoise
        );
      }),
    [circle, ci, zOffset]
  );

  return (
    <group>
      <HubNode label={circle.topic.label} position={hubPos} color={color} />
      {circle.papers.map((paper, i) => {
        const nodePos = paperPositions[i];
        if (!nodePos) return null;
        return (
          <group key={paper.arxiv_id}>
            <Line
              points={[hubPos, nodePos]}
              color={color}
              lineWidth={1.6}
              transparent
              opacity={0.3}
            />
            <PaperNode
              paper={paper}
              position={nodePos}
              color={color}
              topicIdx={ci}
              onSelect={onSelect}
            />
          </group>
        );
      })}
    </group>
  );
}

/* ── Hub-to-hub connections ── */

function HubConnections({
  circles,
  zOffsets,
}: {
  circles: ReturnType<typeof packCircles>;
  zOffsets: number[];
}) {
  const lines = useMemo(() => {
    const hubs = circles.map(
      (c, i) => new THREE.Vector3(c.cx * SCALE, -c.cy * SCALE, zOffsets[i])
    );
    const result: Array<{ a: THREE.Vector3; b: THREE.Vector3; color: string }> = [];
    const added = new Set<string>();

    for (let i = 0; i < hubs.length; i++) {
      const dists = hubs
        .map((h, j) => ({ j, d: hubs[i].distanceTo(h) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);

      for (const { j } of dists) {
        const key = [Math.min(i, j), Math.max(i, j)].join("-");
        if (added.has(key)) continue;
        added.add(key);
        result.push({
          a: hubs[i],
          b: hubs[j],
          color: PALETTE[i % PALETTE.length].hex,
        });
      }
    }
    return result;
  }, [circles, zOffsets]);

  return (
    <>
      {lines.map((l, i) => (
        <Line
          key={i}
          points={[l.a, l.b]}
          color={l.color}
          lineWidth={1.4}
          transparent
          opacity={0.15}
        />
      ))}
    </>
  );
}

/* ── Detail popover ── */

function DetailPopover({
  info,
  onClose,
}: {
  info: SelectedInfo;
  onClose: () => void;
}) {
  const color = PALETTE[info.topicIdx % PALETTE.length].hex;
  const panelPos = info.position.clone().add(new THREE.Vector3(0.18, -0.32, 0));

  return (
    <Html position={panelPos} style={{ pointerEvents: "all" }} distanceFactor={5}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          border: `1px solid ${color}55`,
          borderRadius: 10,
          padding: "12px 14px",
          width: 210,
          boxShadow: `0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px ${color}22`,
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 8, right: 10,
            background: "none", border: "none", cursor: "pointer",
            color: "#9ca3af", fontSize: 16, lineHeight: 1, padding: 0,
          }}
        >
          ×
        </button>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", lineHeight: 1.4, paddingRight: 16 }}>
          {info.paper.title}
        </div>
        {info.paper.authors && (
          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
            {firstAuthor(info.paper.authors)}
          </div>
        )}
        <a
          href={`/abs/${info.paper.arxiv_id}`}
          style={{
            display: "inline-flex", alignItems: "center",
            marginTop: 10, fontSize: 11, fontWeight: 600,
            color, textDecoration: "none",
          }}
        >
          View paper →
        </a>
      </div>
    </Html>
  );
}

/* ── Scene ── */

function Scene({ circles }: { circles: ReturnType<typeof packCircles> }) {
  const [selected, setSelected] = useState<SelectedInfo | null>(null);

  const zOffsets = useMemo(
    () =>
      circles.map((_, i) => {
        const t = (i / Math.max(circles.length - 1, 1)) * Math.PI * 1.8 + 0.4;
        return Math.sin(t) * 2.8 + Math.cos(t * 0.7) * 1.2;
      }),
    [circles]
  );

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[8, 12, 8]} intensity={1.0} color="#ffffff" />
      <directionalLight position={[-6, -4, 6]} intensity={0.4} color="#e0e8ff" />
      <pointLight position={[0, 0, 10]} intensity={0.3} color="#ffffff" />

      <HubConnections circles={circles} zOffsets={zOffsets} />

      {circles.map((circle, ci) => (
        <TopicCluster
          key={circle.topic.label}
          circle={circle}
          ci={ci}
          zOffset={zOffsets[ci]}
          onSelect={(info) => setSelected(info)}
        />
      ))}

      {selected && (
        <DetailPopover info={selected} onClose={() => setSelected(null)} />
      )}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={2}
        maxDistance={50}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
        panSpeed={0.8}
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
        topic: {
          label: topic.label,
          keywords: [],
          fill: topic.fill,
          stroke: topic.stroke,
          text: topic.text,
        },
        papers: topic.paper_ids
          .map((id) => papers.find((p) => p.arxiv_id === id))
          .filter((p): p is Paper => !!p),
        cx: topic.cx,
        cy: topic.cy,
        r: topic.r,
        cardPositions: topic.cardPositions,
      }));
    }
    const positions = radialPositions(papers.length);
    const r = blobRadius(positions);
    return packCircles([
      {
        topic: { label: "Papers", keywords: [], fill: "#e5e7eb", stroke: "none", text: "#6b7280" },
        papers,
        r,
        cardPositions: positions,
      },
    ]);
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
      setChatWidth(
        Math.min(700, Math.max(280, chatDragStartW.current + (chatDragStartX.current - e.clientX)))
      );
    };
    const onUp = () => { chatDragRef.current = false; };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);

  if (papers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <p className="text-sm text-gray-400">No papers yet. Save papers to build your research map.</p>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-white"
    >
      {/* Three.js canvas */}
      <div style={{ position: "absolute", inset: 0, right: chatOpen ? chatWidth : 0 }}>
        <Canvas
          camera={{ position: [0, 0, 14], fov: 55, near: 0.1, far: 200 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          <Suspense fallback={null}>
            <Scene circles={circles} />
          </Suspense>
        </Canvas>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: chatWidth,
            zIndex: 20,
            background: "white",
            borderLeft: "1px solid #e5e7eb",
          }}
        >
          <div
            className="absolute left-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-gray-200"
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

      {/* Controls bar */}
      <div
        className="absolute bottom-4 left-4 flex items-center gap-2"
        style={{ zIndex: 10 }}
      >
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
          style={{
            background: chatOpen ? "#eff6ff" : "white",
            border: chatOpen ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
            color: chatOpen ? "#2563eb" : "#6b7280",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat
        </button>
        <span className="text-[10px] text-gray-400">
          Drag to rotate · Scroll to zoom · Right-drag to pan
        </span>
      </div>
    </div>
  );
}
