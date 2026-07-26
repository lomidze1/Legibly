"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Adds `activeClass` once the element has been scrolled into view, then stops
 * observing. Used for exactly one thing — revealing the Scan/Fix/Verify rail
 * in order, because there the order is the message. Deliberately not a
 * scroll-animation library: this is one-shot, uncoupled from scroll position,
 * and the global reduced-motion block already neutralises the keyframe.
 */
export function RevealOnView({
  as: Tag = "div",
  className,
  activeClass,
  children,
}: {
  as?: "div" | "ol" | "ul";
  className?: string;
  activeClass: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Nothing must depend on the observer existing: without it, show the content.
    if (!("IntersectionObserver" in window)) {
      el.classList.add(activeClass);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [activeClass]);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={seen ? `${className ?? ""} ${activeClass}` : className}
    >
      {children}
    </Tag>
  );
}
