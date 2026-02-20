export interface ArxivPaper {
  title: string;
  authors: string;
  abstract: string;
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

  const title = titleMatch[1].replace(/\s+/g, " ").trim();
  const abstract = abstractMatch[1].replace(/\s+/g, " ").trim();

  return { title, authors, abstract };
}
