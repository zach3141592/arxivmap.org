"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePaperAction } from "./actions";

export interface FeedPaper {
  arxiv_id: string;
  title: string;
  authors: string;
  abstract: string;
  year: number | null;
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

function FeedCard({ paper }: { paper: FeedPaper }) {
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const abstract =
    paper.abstract.length > 320
      ? paper.abstract.slice(0, 320).trimEnd() + "…"
      : paper.abstract;

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saved || isPending) return;
    setSaved(true);
    startTransition(() => savePaperAction(paper));
  }

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
        <div className="ml-auto flex items-center gap-2">
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

type Tab = "latest" | "recommended";

export function FeedClient({
  recommendedPapers,
  latestPapers,
}: {
  recommendedPapers: FeedPaper[];
  latestPapers: FeedPaper[];
}) {
  const [tab, setTab] = useState<Tab>("latest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const papers = tab === "latest" ? latestPapers : recommendedPapers;

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
        router.refresh();
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
      {/* Tab switcher */}
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["latest", "recommended"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium capitalize transition-all ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {papers.length === 0 ? (
        <p className="mt-12 text-center text-sm text-gray-400">
          {tab === "recommended"
            ? "No recommendations yet — try saving more papers to your library."
            : "No papers found."}
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
            <p className="py-8 text-center text-xs text-gray-300">
              You&apos;re all caught up
            </p>
          )}
        </div>
      )}
    </div>
  );
}
