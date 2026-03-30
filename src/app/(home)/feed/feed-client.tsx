"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePaperAction, starPaperAction, refreshFeedAction } from "./actions";

export interface FeedPaper {
  arxiv_id: string;
  title: string;
  authors: string;
  abstract: string;
  year: number | null;
  month: string | null;
}

const PAGE_SIZE = 10;

function BookmarkIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M5 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14l-5-2.5L5 18V4z" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14l-5-2.5L5 18V4z"
      />
    </svg>
  );
}

function truncateAuthors(authors: string): string {
  const parts = authors.split(", ");
  if (parts.length <= 2) return authors;
  return `${parts[0]}, ${parts[1]} et al.`;
}

function FeedCard({ paper }: { paper: FeedPaper }) {
  const [saved, setSaved] = useState(false);
  const [starred, setStarred] = useState(false);
  const [isPending, startTransition] = useTransition();

  const abstract =
    paper.abstract.length > 220
      ? paper.abstract.slice(0, 220).trimEnd() + "…"
      : paper.abstract;

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saved || isPending) return;
    setSaved(true);
    startTransition(() => savePaperAction(paper));
  }

  function handleStar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (starred || isPending) return;
    setStarred(true);
    setSaved(true);
    startTransition(() => starPaperAction(paper));
  }

  return (
    <article className="rounded-2xl border border-gray-200/60 bg-white px-6 py-5 shadow-sm transition-shadow hover:shadow-md">
      <a href={`/abs/${paper.arxiv_id}`} className="block group">
        <h2 className="text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-gray-500 transition-colors">
          {paper.title}
        </h2>
      </a>

      {paper.authors && (
        <p className="mt-2 text-xs text-gray-400 leading-relaxed">
          {truncateAuthors(paper.authors)}
        </p>
      )}

      <p className="mt-3 text-sm leading-[1.7] text-gray-500">{abstract}</p>

      <div className="mt-4 flex items-center gap-3">
        {paper.year && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-400">
            {paper.month ? `${paper.month} ${paper.year}` : paper.year}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleStar}
            disabled={starred || isPending}
            aria-label={starred ? "Starred" : "Star paper"}
            className="flex items-center justify-center rounded-full border p-1.5 transition-colors"
            style={{
              borderColor: starred ? "#fde68a" : "#e5e7eb",
              color: starred ? "#f59e0b" : "#d1d5db",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={starred ? "#f59e0b" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          <button
            onClick={handleSave}
            disabled={saved || isPending}
            aria-label={saved ? "Saved" : "Save paper"}
            className={`flex items-center justify-center rounded-full border p-1.5 transition-colors ${
              saved
                ? "border-gray-900 text-gray-900"
                : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
            }`}
          >
            <BookmarkIcon filled={saved} />
          </button>
          <a
            href={`/abs/${paper.arxiv_id}`}
            className="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-black active:scale-[0.97]"
          >
            Open
          </a>
        </div>
      </div>
    </article>
  );
}

type Tab = "trending" | "recommended";

export function FeedClient({
  recommendedPapers,
  trendingPapers,
}: {
  recommendedPapers: FeedPaper[];
  trendingPapers: FeedPaper[];
}) {
  const [tab, setTab] = useState<Tab>("recommended");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FeedPaper[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  async function runSearch(q: string) {
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    setSearchResults(null);
    try {
      const res = await fetch(`/api/papers/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSearchResults(
        (data as Array<{ id: string; title: string; authors: string; abstract: string; published: string }>).map((p) => ({
          arxiv_id: p.id,
          title: p.title,
          authors: p.authors,
          abstract: p.abstract,
          year: p.published ? new Date(p.published).getFullYear() : null,
          month: p.published ? new Date(p.published).toLocaleString("en-US", { month: "short" }) : null,
        }))
      );
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
  }

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await refreshFeedAction();
    router.refresh();
    setIsRefreshing(false);
  }

  const papers = searchResults ?? (tab === "trending" ? trendingPapers : recommendedPapers);

  // Reset visible count when switching tabs
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab]);

  // Intersection observer for infinite scroll
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

  // Pull-to-refresh on mobile
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let startY = 0;
    let pulling = false;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!pulling) return;
      pulling = false;
      const delta = e.changedTouches[0].clientY - startY;
      if (delta > 60) {
        handleRefresh();
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [router]);

  const visible = papers.slice(0, visibleCount);
  const hasMore = visibleCount < papers.length;

  return (
    <div ref={scrollRef}>
      {/* Search bar */}
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); runSearch(searchQuery); }}
      >
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) clearSearch(); }}
            placeholder={'Search arXiv \u2014 try \u201cRL benchmarks\u201d'}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-4 pr-9 text-sm outline-none placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!searchQuery.trim() || isSearching}
          className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-default disabled:bg-gray-100 disabled:text-gray-300 bg-gray-900 text-white hover:bg-black active:scale-[0.97] disabled:active:scale-100"
        >
          {isSearching ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : "Search"}
        </button>
      </form>

      {/* Tab switcher + refresh — hidden while showing search results */}
      <div className={`mb-4 flex items-center gap-2 ${searchResults !== null ? "hidden" : ""}`}>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 flex-1">
          {(["trending", "recommended"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-medium capitalize transition-all ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh feed"
          className="ml-auto flex items-center justify-center rounded-full border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.389Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {searchResults !== null && (
        <p className="mb-3 text-xs text-gray-400">
          {searchResults.length > 0
            ? `${searchResults.length} results for "${searchQuery}"`
            : `No results for "${searchQuery}"`}
        </p>
      )}

      {papers.length === 0 && !isSearching ? (
        <p className="mt-12 text-center text-sm text-gray-400">
          {searchResults !== null
            ? `No results for "${searchQuery}"`
            : tab === "recommended"
            ? "No recommendations yet — try saving more papers to your library."
            : "No trending papers found."}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((paper) => (
            <FeedCard key={paper.arxiv_id} paper={paper} />
          ))}

          {hasMore ? (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400" />
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 text-gray-200">
                <div className="h-px w-16 bg-gray-200" />
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
                <div className="h-px w-16 bg-gray-200" />
              </div>
              <p className="text-xs text-gray-300">You&apos;re all caught up</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
