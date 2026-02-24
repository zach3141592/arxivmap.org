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
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onScroll() {
      el!.classList.remove("scroll-fading");
      el!.classList.add("is-scrolling");
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);

      fadeTimer.current = setTimeout(() => {
        el!.classList.add("scroll-fading");
      }, 800);

      hideTimer.current = setTimeout(() => {
        el!.classList.remove("is-scrolling", "scroll-fading");
      }, 1600);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
