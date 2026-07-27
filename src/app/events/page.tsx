"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { EVENTS } from "@/lib/mockData";

type Tab = "all" | "ongoing" | "ended";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "전체 이벤트" },
  { key: "ongoing", label: "진행중인 이벤트" },
  { key: "ended", label: "종료된 이벤트" },
];

function EventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) ?? "ongoing";

  const filtered = EVENTS.filter((e) => tab === "all" || e.status === tab);

  return (
    <div className="px-4 py-5">
      <div className="flex items-center gap-1.5 mb-1">
        <Bell size={18} className="text-brand" />
        <h1 className="text-xl font-extrabold">이벤트</h1>
      </div>
      <p className="text-sm text-muted mb-5">타이어존의 다양한 이벤트를 확인해보세요!</p>

      <div className="flex border-b border-border mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.push(`/events?tab=${t.key}`)}
            className={`flex-1 pb-3 text-sm font-semibold border-b-2 -mb-px ${
              tab === t.key ? "border-brand text-brand" : "border-transparent text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted py-16 text-sm animate-[fade-slide-up_400ms_ease-out_both]">
          <Bell size={32} className="mx-auto mb-3 text-border" strokeWidth={1.5} />
          해당하는 이벤트가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((e, i) => (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="block group animate-[fade-slide-up_400ms_ease-out_both]"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div
                className="h-32 rounded-xl mb-2 transition-transform group-hover:-translate-y-1 group-hover:shadow-lg"
                style={{ background: e.bannerGradient }}
              />
              <p className="text-sm font-semibold group-hover:text-brand">{e.title}</p>
              <p className="text-xs text-muted mt-0.5">{e.period}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="p-10 text-center text-muted">불러오는 중...</div>}>
        <EventsContent />
      </Suspense>
    </RequireAuth>
  );
}
