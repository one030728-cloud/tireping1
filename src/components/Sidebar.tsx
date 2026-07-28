"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { MYPAGE_LINKS, SIDEBAR_LINKS } from "@/lib/nav";

export default function Sidebar() {
  const pathname = usePathname();
  const [mypageOpen, setMypageOpen] = useState(true);

  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col gap-1 py-6 pr-4 border-r border-border sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
      {SIDEBAR_LINKS.map((link) => {
        const active = pathname === link.href.split("?")[0];
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative px-3 py-2.5 rounded-lg text-sm font-medium ${
              active
                ? "bg-brand/10 text-brand"
                : "text-foreground/80 hover:bg-surface hover:text-brand"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 h-4 w-1 rounded-full bg-brand" />
            )}
            {link.label}
          </Link>
        );
      })}

      <button
        onClick={() => setMypageOpen((v) => !v)}
        aria-expanded={mypageOpen}
        className="mt-2 px-3 py-2.5 text-sm font-semibold text-foreground flex items-center justify-between hover:text-brand"
      >
        마이페이지
        <ChevronRight
          size={15}
          className={`transition-transform ${mypageOpen ? "rotate-90" : ""}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          mypageOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pl-3 flex flex-col gap-0.5 border-l border-border ml-3">
            {MYPAGE_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-xs ${
                    active
                      ? "bg-brand/10 text-brand font-semibold"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <Link
        href="/events?tab=ongoing"
        className="mt-6 rounded-lg overflow-hidden relative block bg-brand text-white p-4 text-sm font-bold transition-colors hover:bg-[var(--brand-dark)]"
      >
        타이어존 GRAND EVENT
        <p className="text-xs font-normal mt-1 opacity-90">지금 바로 이벤트를 확인해보세요</p>
      </Link>
    </aside>
  );
}
