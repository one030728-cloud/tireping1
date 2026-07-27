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
  // CSS scroll-snap fights a JS-driven scrollLeft animation: the browser
  // snaps straight to the nearest snap point on every write instead of
  // honoring the eased intermediate values, so the slide appears to jump
  // in a couple of big steps instead of gliding. Suspend snapping for the
  // duration of the animation and restore it once it settles.
  const previousSnapType = el.style.scrollSnapType;
  el.style.scrollSnapType = "none";
  function step(now: number) {
    if (tokenRef.current !== token) return;
    const progress = Math.min((now - start) / duration, 1);
    el.scrollLeft = from + change * easeInOutQuad(progress);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.style.scrollSnapType = previousSnapType;
    }
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
          <div
            key={i}
            className="snap-start shrink-0 animate-[fade-slide-up_400ms_ease-out_both]"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {child}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => slide(-1)}
        aria-label="이전"
        className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 rounded-full bg-surface border border-border shadow-[var(--shadow-md)] opacity-0 group-hover/carousel:opacity-100 hover:border-brand/40 hover:text-brand transition-all"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => slide(1)}
        aria-label="다음"
        className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 rounded-full bg-surface border border-border shadow-[var(--shadow-md)] opacity-0 group-hover/carousel:opacity-100 hover:border-brand/40 hover:text-brand transition-all"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
