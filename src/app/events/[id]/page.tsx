"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { EVENTS } from "@/lib/mockData";

function EventDetailContent() {
  const params = useParams<{ id: string }>();
  const event = EVENTS.find((e) => e.id === params.id);

  if (!event) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-muted mb-4">존재하지 않는 이벤트입니다.</p>
        <Link href="/events" className="text-brand font-semibold">
          이벤트 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <Link href="/events" className="text-sm text-muted mb-4 inline-flex items-center gap-0.5">
        <ChevronLeft size={16} /> 이벤트 목록
      </Link>
      <div
        className="h-48 rounded-2xl mb-5 flex items-end p-5"
        style={{ background: event.bannerGradient }}
      >
        <span
          className={`text-xs font-bold px-2 py-1 rounded ${
            event.status === "ongoing" ? "bg-brand text-white" : "bg-black/40 text-white"
          }`}
        >
          {event.status === "ongoing" ? "진행중" : "종료"}
        </span>
      </div>
      <h1 className="text-xl font-extrabold mb-1">{event.title}</h1>
      <p className="text-sm text-muted mb-5">{event.period}</p>
      <div className="bg-surface border border-border rounded-xl p-5 text-sm leading-relaxed">
        {event.description}
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <RequireAuth>
      <EventDetailContent />
    </RequireAuth>
  );
}
