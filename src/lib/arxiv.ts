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

export async function fetchArxivPaper(
  paperId: string
): Promise<ArxivPaper | null> {
  const res = await fetch(
    `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(paperId)}`
  );
  if (!res.ok) return null;

  const xml = await res.text();

  // Check if an entry exists
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  if (!entryMatch) return null;
  const entry = entryMatch[1];

  // arxiv returns an entry even for invalid IDs, but with a specific id format
  // Check for a real paper by looking for a doi or arxiv id link
  if (!entry.includes("arxiv.org/abs/")) return null;

  const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
  const abstractMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);

  if (!titleMatch || !abstractMatch) return null;

  // Extract all author names
  const authorMatches = [...entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)];
  const authors = authorMatches.map((m) => m[1].trim()).join(", ");

  const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
  const published = publishedMatch ? publishedMatch[1].trim() : undefined;

  const title = titleMatch[1].replace(/\s+/g, " ").trim();
  const abstract = abstractMatch[1].replace(/\s+/g, " ").trim();

  return { title, authors, abstract, published };
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
