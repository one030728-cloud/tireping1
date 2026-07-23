import Link from "next/link";
import { MYPAGE_LINKS, SIDEBAR_LINKS } from "@/lib/nav";

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col gap-1 py-6 pr-4 border-r border-border">
      {SIDEBAR_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-surface hover:text-brand"
        >
          {link.label}
        </Link>
      ))}

      <div className="mt-2 px-3 py-2.5 text-sm font-semibold text-foreground">마이페이지</div>
      <div className="pl-3 flex flex-col gap-0.5 border-l border-border ml-3">
        {MYPAGE_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-2 rounded-lg text-xs text-muted hover:bg-surface hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-xl overflow-hidden bg-gradient-to-br from-accent to-brand text-white p-4 text-sm font-bold">
        타이어존 GRAND EVENT
        <p className="text-xs font-normal mt-1 opacity-90">지금 바로 이벤트를 확인해보세요</p>
      </div>
    </aside>
  );
}
