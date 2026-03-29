"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const tabs = [
  { id: "papers", label: "Papers", href: "?tab=papers" },
  { id: "trees", label: "Research Trees", href: "?tab=trees" },
  { id: "map", label: "My Map", href: "?tab=map" },
];

function Nav() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "papers";

  return (
    <nav className="flex items-center gap-1">
      {tabs.map((t) => (
        <a
          key={t.id}
          href={t.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            activeTab === t.id
              ? "bg-gray-100 font-medium text-gray-900"
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          {t.label}
        </a>
      ))}
      <a
        href="/how-to-use"
        className="rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:text-gray-700"
      >
        How to use
      </a>
    </nav>
  );
}

export function HeaderNav() {
  return (
    <Suspense>
      <Nav />
    </Suspense>
  );
}
