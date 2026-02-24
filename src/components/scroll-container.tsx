"use client";

import { useRef, useEffect, type ReactNode } from "react";

export function ScrollContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onScroll() {
      el!.classList.add("is-scrolling");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        el!.classList.remove("is-scrolling");
      }, 1000);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
