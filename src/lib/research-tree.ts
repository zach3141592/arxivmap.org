import Anthropic from "@anthropic-ai/sdk";
import { searchArxivPapers } from "./arxiv";

// Types
export interface TreeNode {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  year: number;
  relationship:
    | "foundational"
    | "extends"
    | "alternative"
    | "applies"
    | "successor";
  relevance: string;
}

export interface TreeEdge {
  source: string;
  target: string;
  label: string;
}

export interface ResearchTree {
  root: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  generatedAt: string;
}

interface CandidatePaper {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  year: number;
}

interface SemanticScholarRef {
  title?: string;
  year?: number;
  abstract?: string;
  externalIds?: { ArXiv?: string };
}

const anthropic = new Anthropic();

export async function fetchSemanticScholarRefs(
  arxivId: string
): Promise<CandidatePaper[]> {
  try {
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/ArXiv:${arxivId}?fields=references.title,references.externalIds,references.year,references.abstract`,
      { headers: { "User-Agent": "arxivmap.org" } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const refs: SemanticScholarRef[] = data.references ?? [];

    return refs
      .filter(
        (r): r is SemanticScholarRef & { externalIds: { ArXiv: string } } =>
          !!r.externalIds?.ArXiv && !!r.title
      )
      .map((r) => ({
        id: r.externalIds!.ArXiv!,
        title: r.title ?? "",
        authors: "",
        abstract: r.abstract ?? "",
        year: r.year ?? 0,
      }));
  } catch {
    return [];
  }
}

export async function extractSearchTerms(
  abstract: string
): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Extract 3-5 specific technical search terms from this abstract that would help find related papers. Return ONLY a JSON array of strings, nothing else.\n\nAbstract: ${abstract}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) return JSON.parse(match[0]);
  } catch {
    // fallback
  }
  return [];
}

export async function buildTreeWithClaude(
  rootPaper: { id: string; title: string; abstract: string; authors: string; year: number },
  candidates: CandidatePaper[]
): Promise<ResearchTree> {
  const candidateList = candidates
    .map(
      (c, i) =>
        `[${i}] ID: ${c.id} | Title: ${c.title} | Year: ${c.year} | Abstract: ${c.abstract.slice(0, 300)}`
    )
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are building a research tree showing how papers relate to a root paper.

ROOT PAPER:
ID: ${rootPaper.id}
Title: ${rootPaper.title}
Year: ${rootPaper.year}
Abstract: ${rootPaper.abstract.slice(0, 500)}

CANDIDATE PAPERS:
${candidateList}

Select 6-10 of the most relevant candidates. For each selected paper, assign:
- relationship: one of "foundational", "extends", "alternative", "applies", "successor"
- relevance: one sentence explaining why this paper relates to the root
- Create edges between papers that are related (source -> target, with a label like "builds on", "inspired by", "extends", "alternative to", "applied by")

The root paper should be connected to at least some of the selected papers.

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "root": "${rootPaper.id}",
  "nodes": [
    {
      "id": "arxiv_id",
      "title": "paper title",
      "authors": "authors",
      "abstract": "abstract",
      "year": 2024,
      "relationship": "foundational",
      "relevance": "one sentence"
    }
  ],
  "edges": [
    { "source": "arxiv_id_1", "target": "arxiv_id_2", "label": "builds on" }
  ],
  "generatedAt": "${new Date().toISOString()}"
}

Include the root paper as a node with relationship "foundational". Every node must be connected via at least one edge.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse tree from Claude response");
  }

  const tree: ResearchTree = JSON.parse(jsonMatch[0]);

  // Ensure root node exists
  if (!tree.nodes.find((n) => n.id === rootPaper.id)) {
    tree.nodes.unshift({
      id: rootPaper.id,
      title: rootPaper.title,
      authors: rootPaper.authors,
      abstract: rootPaper.abstract,
      year: rootPaper.year,
      relationship: "foundational",
      relevance: "The root paper being analyzed.",
    });
  }

  return tree;
}

export type ProgressCallback = (step: string, progress: number) => void;

export async function generateResearchTree(
  paperId: string,
  title: string,
  abstract: string,
  authors: string = "",
  onProgress?: ProgressCallback
): Promise<ResearchTree> {
  onProgress?.("Fetching references...", 0.2);

  // Step 1: Semantic Scholar references
  const semanticRefs = await fetchSemanticScholarRefs(paperId);

  onProgress?.("Searching related papers...", 0.4);

  // Step 2: Extract search terms and search arxiv
  const searchTerms = await extractSearchTerms(abstract);
  const query = searchTerms.join(" ");
  const arxivResults = await searchArxivPapers(query, 10);

  onProgress?.("Processing candidates...", 0.6);

  // Step 3: Merge and deduplicate candidates
  const candidateMap = new Map<string, CandidatePaper>();

  for (const ref of semanticRefs) {
    if (ref.id !== paperId) {
      candidateMap.set(ref.id, ref);
    }
  }

  for (const result of arxivResults) {
    if (result.id !== paperId && !candidateMap.has(result.id)) {
      candidateMap.set(result.id, {
        id: result.id,
        title: result.title,
        authors: result.authors,
        abstract: result.abstract,
        year: result.published
          ? new Date(result.published).getFullYear()
          : 0,
      });
    }
  }

  // Cap at ~15 candidates
  const candidates = [...candidateMap.values()].slice(0, 15);

  if (candidates.length === 0) {
    // Return a minimal tree with just the root
    return {
      root: paperId,
      nodes: [
        {
          id: paperId,
          title,
          authors,
          abstract,
          year: new Date().getFullYear(),
          relationship: "foundational",
          relevance: "The root paper being analyzed.",
        },
      ],
      edges: [],
      generatedAt: new Date().toISOString(),
    };
  }

  onProgress?.("Building tree with AI...", 0.8);

  // Step 4: Claude builds the tree
  // Extract year from paperId if possible (e.g. "2301.00001" -> 2023)
  let rootYear = new Date().getFullYear();
  const yearMatch = paperId.match(/^(\d{2})/);
  if (yearMatch) {
    const twoDigit = parseInt(yearMatch[1]);
    rootYear = twoDigit >= 90 ? 1900 + twoDigit : 2000 + twoDigit;
  }

  const tree = await buildTreeWithClaude(
    { id: paperId, title, abstract, authors, year: rootYear },
    candidates
  );

  return tree;
}
