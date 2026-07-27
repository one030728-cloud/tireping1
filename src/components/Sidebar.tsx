"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MYPAGE_LINKS, SIDEBAR_LINKS } from "@/lib/nav";

export default function Sidebar() {
  const pathname = usePathname();

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

      <div className="mt-2 px-3 py-2.5 text-sm font-semibold text-foreground">마이페이지</div>
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

      <Link
        href="/events?tab=ongoing"
        className="mt-6 rounded-2xl overflow-hidden relative block bg-gradient-to-br from-accent via-accent to-brand text-white p-4 text-sm font-bold shadow-[var(--shadow-accent)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-8px_rgba(244,63,94,0.5)]"
      >
        <div className="absolute -right-4 -top-6 w-20 h-20 rounded-full bg-white/15 blur-sm" />
        <div className="relative">
          타이어존 GRAND EVENT
          <p className="text-xs font-normal mt-1 opacity-90">지금 바로 이벤트를 확인해보세요</p>
        </div>
      </Link>
    </aside>
  );
}
