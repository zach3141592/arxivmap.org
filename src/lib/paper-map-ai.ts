import Anthropic from "@anthropic-ai/sdk";
import { radialPositions, blobRadius, packCircles } from "./map-layout";

const anthropic = new Anthropic();

export interface StoredMapData {
  topics: Array<{
    label: string;
    fill: string;
    stroke: string;
    text: string;
    cx: number;
    cy: number;
    r: number;
    paper_ids: string[];
    cardPositions: Array<{ x: number; y: number }>;
  }>;
  generated_at: string;
}

interface PaperInput {
  arxiv_id: string;
  title: string;
  authors?: string;
  abstract?: string;
}

const COLOR_PALETTE = [
  { fill: "rgba(191,219,254,0.45)", stroke: "none", text: "#475569" },
  { fill: "rgba(253,230,138,0.4)", stroke: "none", text: "#92400e" },
  { fill: "rgba(167,243,208,0.4)", stroke: "none", text: "#166534" },
  { fill: "rgba(216,180,254,0.4)", stroke: "none", text: "#6b21a8" },
  { fill: "rgba(249,168,212,0.4)", stroke: "none", text: "#9d174d" },
  { fill: "rgba(252,165,165,0.4)", stroke: "none", text: "#b91c1c" },
  { fill: "rgba(253,224,71,0.35)", stroke: "none", text: "#854d0e" },
  { fill: "rgba(147,197,253,0.4)", stroke: "none", text: "#1e40af" },
];

interface ClusterResult {
  topics: Array<{ label: string; paper_ids: string[] }>;
}

export async function generateMapClusters(papers: PaperInput[]): Promise<ClusterResult> {
  const paperList = papers
    .map((p) => {
      const snippet = p.abstract ? p.abstract.slice(0, 150) : "";
      return `- ID: ${p.arxiv_id} | "${p.title}"${snippet ? ` | ${snippet}...` : ""}`;
    })
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are organizing a researcher's paper library into a visual map. Cluster these ${papers.length} papers into 2-8 topical groups. Each paper must appear in exactly one group.

PAPERS:
${paperList}

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "topics": [
    { "label": "Short Topic Name", "paper_ids": ["2301.00001", "2302.00002"] }
  ]
}

Rules:
- Topic labels should be specific and descriptive (e.g. "Reward Optimization" not "Machine Learning")
- Every paper ID must appear in exactly one topic
- 2-8 topics total
- Labels should be 1-3 words`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse clusters from Claude response");
  }

  const result: ClusterResult = JSON.parse(jsonMatch[0]);

  // Validate: ensure all paper IDs are accounted for
  const allIds = new Set(papers.map((p) => p.arxiv_id));
  const assignedIds = new Set(result.topics.flatMap((t) => t.paper_ids));

  // Add any missing papers to an "Other" topic
  const missing = [...allIds].filter((id) => !assignedIds.has(id));
  if (missing.length > 0) {
    const otherTopic = result.topics.find((t) => t.label.toLowerCase() === "other");
    if (otherTopic) {
      otherTopic.paper_ids.push(...missing);
    } else {
      result.topics.push({ label: "Other", paper_ids: missing });
    }
  }

  // Remove any paper IDs that don't exist in the input
  for (const topic of result.topics) {
    topic.paper_ids = topic.paper_ids.filter((id) => allIds.has(id));
  }

  // Remove empty topics
  result.topics = result.topics.filter((t) => t.paper_ids.length > 0);

  return result;
}

export function buildMapData(clusters: ClusterResult, papers: PaperInput[]): StoredMapData {
  const paperMap = new Map(papers.map((p) => [p.arxiv_id, p]));

  const blobs = clusters.topics.map((topic, i) => {
    const color = COLOR_PALETTE[i % COLOR_PALETTE.length];
    const topicPapers = topic.paper_ids
      .map((id) => paperMap.get(id))
      .filter((p): p is PaperInput => !!p);
    const positions = radialPositions(topicPapers.length);
    const r = blobRadius(positions);

    return {
      topic: { label: topic.label, keywords: [], ...color },
      papers: topicPapers,
      r,
      cardPositions: positions,
    };
  });

  const packed = packCircles(blobs);

  return {
    topics: packed.map((c) => ({
      label: c.topic.label,
      fill: c.topic.fill,
      stroke: c.topic.stroke,
      text: c.topic.text,
      cx: c.cx,
      cy: c.cy,
      r: c.r,
      paper_ids: c.papers.map((p) => p.arxiv_id),
      cardPositions: c.cardPositions,
    })),
    generated_at: new Date().toISOString(),
  };
}
