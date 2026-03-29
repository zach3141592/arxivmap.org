"use client";

import { usePathname } from "next/navigation";

const tabs = [
  { href: "/feed", label: "Feed" },
  { href: "/papers", label: "Papers" },
  { href: "/map", label: "My Map" },
  { href: "/how-to-use", label: "How to use" },
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {tabs.map((t) => (
        <a
          key={t.href}
          href={t.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            pathname === t.href
              ? "bg-gray-100 font-medium text-gray-900"
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          {t.label}
        </a>
      ))}
    </nav>
  );
}
