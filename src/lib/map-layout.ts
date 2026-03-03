/* ── Shared layout utilities for the paper map ── */

export interface TopicDef {
  label: string;
  keywords: string[];
  fill: string;
  stroke: string;
  text: string;
}

export interface CircleBlob {
  topic: TopicDef;
  papers: { arxiv_id: string; title: string; authors?: string }[];
  cx: number;
  cy: number;
  r: number;
  cardPositions: { x: number; y: number }[];
}

/* ── Layout constants ── */

export const CARD_W = 240;
export const CARD_H = 76;
export const RING_SPACING = 100;
export const BLOB_PAD = 70;
export const BLOB_OVERLAP = 40;

/* ── Radial paper positions inside a circle ── */

export function radialPositions(count: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const positions: { x: number; y: number }[] = [];

  positions.push({ x: 0, y: 0 });
  if (count === 1) return positions;

  let placed = 1;
  let ring = 1;
  while (placed < count) {
    const radius = ring * RING_SPACING;
    const circumference = 2 * Math.PI * radius;
    const fitCount = Math.max(3, Math.floor(circumference / (CARD_W * 0.65)));
    const inRing = Math.min(fitCount, count - placed);
    const angleOffset = ring % 2 === 0 ? 0 : Math.PI / inRing;

    for (let i = 0; i < inRing; i++) {
      const angle = (2 * Math.PI * i) / inRing - Math.PI / 2 + angleOffset;
      positions.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
      placed++;
    }
    ring++;
  }
  return positions;
}

export function blobRadius(positions: { x: number; y: number }[]): number {
  if (positions.length === 0) return 100;
  const maxDist = Math.max(...positions.map((p) => Math.sqrt(p.x * p.x + p.y * p.y)));
  return maxDist + CARD_W / 2 + BLOB_PAD;
}

/* ── Circle packing ── */

export function packCircles(blobs: Omit<CircleBlob, "cx" | "cy">[]): CircleBlob[] {
  blobs.sort((a, b) => b.r - a.r);

  const placed: CircleBlob[] = [];
  for (const blob of blobs) {
    if (placed.length === 0) {
      placed.push({ ...blob, cx: 0, cy: 0 });
      continue;
    }

    const minDist = blob.r + placed[0].r - BLOB_OVERLAP;
    let bestCx = 0, bestCy = 0, found = false;
    for (let dist = minDist; dist < 3000 && !found; dist += 8) {
      const steps = Math.max(1, Math.floor((2 * Math.PI * dist) / 30));
      for (let s = 0; s < steps && !found; s++) {
        const angle = (2 * Math.PI * s) / steps;
        const tx = dist * Math.cos(angle);
        const ty = dist * Math.sin(angle);
        let tooClose = false;
        for (const p of placed) {
          const dx = tx - p.cx;
          const dy = ty - p.cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          const cardZone = (blob.r - BLOB_PAD + 20) + (p.r - BLOB_PAD + 20);
          if (d < cardZone) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) {
          bestCx = tx;
          bestCy = ty;
          found = true;
        }
      }
    }
    placed.push({ ...blob, cx: bestCx, cy: bestCy });
  }

  return placed;
}
