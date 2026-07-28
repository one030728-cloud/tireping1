"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function HeroCarousel({
  slides,
  autoPlayInterval = 4000,
  className = "",
}: {
  slides: { key: string; content: ReactNode }[];
  autoPlayInterval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const count = slides.length;

  function go(next: number) {
    setIndex(((next % count) + count) % count);
  }

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      if (!pausedRef.current) setIndex((i) => (i + 1) % count);
    }, autoPlayInterval);
    return () => clearInterval(id);
  }, [count, autoPlayInterval]);

  if (count === 0) return null;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden h-40 md:h-60 lg:h-80 ${className}`}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((s) => (
          <div key={s.key} className="w-full h-full shrink-0">
            {s.content}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
