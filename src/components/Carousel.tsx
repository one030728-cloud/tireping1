"use client";

import { useCallback, useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animateScrollTo(
  el: HTMLElement,
  to: number,
  duration: number,
  tokenRef: MutableRefObject<number>,
) {
  const token = ++tokenRef.current;
  const from = el.scrollLeft;
  const change = to - from;
  if (change === 0) return;
  const start = performance.now();
  function step(now: number) {
    if (tokenRef.current !== token) return;
    const progress = Math.min((now - start) / duration, 1);
    el.scrollLeft = from + change * easeInOutQuad(progress);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function cardPitch(track: HTMLElement): number {
  const first = track.children[0] as HTMLElement | undefined;
  const second = track.children[1] as HTMLElement | undefined;
  if (first && second) return second.offsetLeft - first.offsetLeft;
  return track.clientWidth * 0.8;
}

export default function Carousel({
  children,
  autoPlayInterval,
}: {
  children: ReactNode[];
  autoPlayInterval?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const animationTokenRef = useRef(0);

  const slide = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll <= 0) return;
    const atEnd = track.scrollLeft >= maxScroll - 1;
    const atStart = track.scrollLeft <= 1;
    let target: number;
    if (direction === 1 && atEnd) {
      target = 0;
    } else if (direction === -1 && atStart) {
      target = maxScroll;
    } else {
      target = track.scrollLeft + cardPitch(track) * direction;
    }
    target = Math.max(0, Math.min(target, maxScroll));
    animateScrollTo(track, target, 450, animationTokenRef);
  }, []);

  useEffect(() => {
    if (!autoPlayInterval) return;
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!pausedRef.current && track && track.offsetParent !== null) slide(1);
    }, autoPlayInterval);
    return () => clearInterval(id);
  }, [autoPlayInterval, slide]);

  return (
    <div
      className="relative group/carousel max-w-2xl"
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
        className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 snap-x snap-proximity [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
