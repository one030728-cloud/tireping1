"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Carousel({
  children,
  autoPlayInterval,
}: {
  children: ReactNode[];
  autoPlayInterval?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  function slide(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    const atStart = track.scrollLeft <= 1;
    if (direction === 1 && atEnd) {
      track.scrollTo({ left: 0, behavior: "smooth" });
    } else if (direction === -1 && atStart) {
      track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
    } else {
      track.scrollBy({ left: track.clientWidth * 0.8 * direction, behavior: "smooth" });
    }
  }

  useEffect(() => {
    if (!autoPlayInterval) return;
    const id = setInterval(() => {
      if (!pausedRef.current) slide(1);
    }, autoPlayInterval);
    return () => clearInterval(id);
  }, [autoPlayInterval]);

  return (
    <div
      className="relative group/carousel"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onTouchStart={() => {
        pausedRef.current = true;
      }}
    >
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, i) => (
          <div key={i} className="snap-start shrink-0">
            {child}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => slide(-1)}
        aria-label="이전"
        className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 items-center justify-center w-8 h-8 rounded-full bg-white border border-border shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => slide(1)}
        aria-label="다음"
        className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 items-center justify-center w-8 h-8 rounded-full bg-white border border-border shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
