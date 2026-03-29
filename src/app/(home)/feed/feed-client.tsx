"use client";

import { useState, useEffect, useRef } from "react";

export interface FeedPaper {
  arxiv_id: string;
  title: string;
  authors: string;
  abstract: string;
  year: number | null;
}

const PAGE_SIZE = 6;

function FeedCard({ paper }: { paper: FeedPaper }) {
  const abstract =
    paper.abstract.length > 320
      ? paper.abstract.slice(0, 320).trimEnd() + "…"
      : paper.abstract;

  return (
    <article className="rounded-2xl border border-gray-100 bg-white px-6 py-5 transition-shadow hover:shadow-sm">
      <a href={`/abs/${paper.arxiv_id}`} className="block group">
        <h2 className="text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-gray-500 transition-colors">
          {paper.title}
        </h2>
      </a>

      {paper.authors && (
        <p className="mt-2 text-xs text-gray-400 leading-relaxed">
          {paper.authors}
        </p>
      )}

      <p className="mt-3 text-sm leading-[1.7] text-gray-500">{abstract}</p>

      <div className="mt-4 flex items-center gap-3">
        {paper.year && (
          <span className="rounded-full border border-gray-100 px-2.5 py-0.5 text-[11px] text-gray-400">
            {paper.year}
          </span>
        )}
        <a
          href={`https://arxiv.org/abs/${paper.arxiv_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-gray-300 transition-colors hover:text-gray-500"
          onClick={(e) => e.stopPropagation()}
        >
          arxiv.org/{paper.arxiv_id}
        </a>
        <a
          href={`/abs/${paper.arxiv_id}`}
          className="ml-auto rounded-full bg-gray-900 px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-black active:scale-[0.97]"
        >
          Open
        </a>
      </div>
    </article>
  );
}

export function FeedClient({ papers }: { papers: FeedPaper[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, papers.length));
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [papers.length]);

  if (papers.length === 0) {
    return (
      <p className="mt-12 text-center text-sm text-gray-400">
        No recommendations yet — try saving more papers to your library.
      </p>
    );
  }

  const visible = papers.slice(0, visibleCount);
  const hasMore = visibleCount < papers.length;

  return (
    <div className="space-y-3">
      {visible.map((paper) => (
        <FeedCard key={paper.arxiv_id} paper={paper} />
      ))}

      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center py-6">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400" />
        </div>
      ) : (
        <p className="py-8 text-center text-xs text-gray-300">
          You&apos;re all caught up
        </p>
      )}
    </div>
  );
}
