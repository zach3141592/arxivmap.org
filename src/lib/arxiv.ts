export interface ArxivPaper {
  title: string;
  authors: string;
  abstract: string;
  published?: string;
}

export interface ArxivSearchResult {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  published: string;
}

async function fetchFromArxiv(paperId: string): Promise<ArxivPaper | null> {
  try {
    const res = await fetch(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(paperId)}`,
      { signal: AbortSignal.timeout(7000) }
    );
    if (!res.ok) return null;

    const xml = await res.text();
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return null;
    const entry = entryMatch[1];
    if (!entry.includes("arxiv.org/abs/")) return null;

    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const abstractMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
    if (!titleMatch || !abstractMatch) return null;

    const authorMatches = [...entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)];
    const authors = authorMatches.map((m) => m[1].trim()).join(", ");
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const published = publishedMatch ? publishedMatch[1].trim() : undefined;

    return {
      title: titleMatch[1].replace(/\s+/g, " ").trim(),
      authors,
      abstract: abstractMatch[1].replace(/\s+/g, " ").trim(),
      published,
    };
  } catch {
    return null;
  }
}

async function fetchFromSemanticScholar(paperId: string): Promise<ArxivPaper | null> {
  try {
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/arXiv:${paperId}?fields=title,authors,abstract,year,publicationDate`,
      { signal: AbortSignal.timeout(7000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.title) return null;

    const authors = (data.authors ?? []).map((a: { name: string }) => a.name).join(", ");
    return {
      title: data.title,
      authors,
      abstract: data.abstract ?? "",
      published: data.publicationDate ?? (data.year ? String(data.year) : undefined),
    };
  } catch {
    return null;
  }
}

export async function fetchArxivPaper(
  paperId: string
): Promise<ArxivPaper | null> {
  // Fire both in parallel — take whichever succeeds first.
  // This avoids blowing Vercel's 10s timeout when arxiv is slow to reject.
  try {
    return await Promise.any([
      fetchFromSemanticScholar(paperId),
      fetchFromArxiv(paperId),
    ]);
  } catch {
    return null;
  }
}

function parseArxivEntry(entry: string): ArxivSearchResult | null {
  if (!entry.includes("arxiv.org/abs/")) return null;

  const idMatch = entry.match(/arxiv\.org\/abs\/([^<"]+)/);
  if (!idMatch) return null;
  // Strip version suffix (e.g. "2301.00001v1" -> "2301.00001")
  const id = idMatch[1].replace(/v\d+$/, "");

  const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
  const abstractMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
  const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
  if (!titleMatch || !abstractMatch) return null;

  const authorMatches = [...entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)];
  const authors = authorMatches.map((m) => m[1].trim()).join(", ");

  return {
    id,
    title: titleMatch[1].replace(/\s+/g, " ").trim(),
    authors,
    abstract: abstractMatch[1].replace(/\s+/g, " ").trim(),
    published: publishedMatch ? publishedMatch[1].trim() : "",
  };
}

export async function fetchLatestArxivPapers(
  categories = ["cs.AI", "cs.LG", "cs.CV", "stat.ML"],
  maxResults = 100
): Promise<ArxivSearchResult[]> {
  const catQuery = categories.map((c) => `cat:${c}`).join("+OR+");
  try {
    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=${catQuery}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`,
      { signal: AbortSignal.timeout(12000), cache: "no-store" }
    );
    if (!res.ok) return [];

    const xml = await res.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

    const results: ArxivSearchResult[] = [];
    for (const match of entries) {
      const parsed = parseArxivEntry(match[1]);
      if (parsed) results.push(parsed);
    }
    return results;
  } catch {
    return [];
  }
}

export async function fetchTrendingArxivPapers(
  categories = ["cs.AI", "cs.LG", "cs.CV", "stat.ML"],
  maxResults = 200
): Promise<ArxivSearchResult[]> {
  // Fetch a broad window of recent papers, then rank by citation count
  const recent = await fetchLatestArxivPapers(categories, maxResults);
  if (recent.length === 0) return [];

  try {
    const ids = recent.map((p) => `ArXiv:${p.id}`);
    const res = await fetch(
      "https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount,externalIds",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      }
    );

    if (!res.ok) return recent;

    const data: Array<{ citationCount?: number; externalIds?: { ArXiv?: string } } | null> =
      await res.json();

    const citationMap = new Map<string, number>();
    for (const paper of data) {
      if (paper?.externalIds?.ArXiv) {
        citationMap.set(paper.externalIds.ArXiv, paper.citationCount ?? 0);
      }
    }

    return [...recent].sort(
      (a, b) => (citationMap.get(b.id) ?? 0) - (citationMap.get(a.id) ?? 0)
    );
  } catch {
    return recent;
  }
}

export async function searchArxivPapers(
  query: string,
  maxResults: number = 10
): Promise<ArxivSearchResult[]> {
  const res = await fetch(
    `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=${maxResults}&sortBy=relevance`
  );
  if (!res.ok) return [];

  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

  const results: ArxivSearchResult[] = [];
  for (const match of entries) {
    const parsed = parseArxivEntry(match[1]);
    if (parsed) results.push(parsed);
  }
  return results;
}
