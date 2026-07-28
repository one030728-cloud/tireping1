"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  CreditCard,
  HelpCircle,
  Megaphone,
  Rss,
  Send,
  Settings,
  Store,
  Truck,
  Undo2,
  User,
} from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import LoadingState from "@/components/LoadingState";
import { CUSTOMER_LINKS } from "@/lib/nav";
import { FAQ_CATEGORIES, FAQ_ITEMS, NOTICES, UPDATE_LOGS } from "@/lib/mockData";

const FAQ_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  order: CreditCard,
  delivery: Truck,
  cancel: Undo2,
  sell: Store,
  member: User,
  etc: Settings,
};

function NoticeTable() {
  return (
    <>
      <h1 className="text-xl font-extrabold mb-1">공지사항</h1>
      <p className="text-sm text-muted mb-5">총 {NOTICES.length}개의 게시물</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm border-collapse">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-3 px-4 font-medium w-20">글번호</th>
              <th className="py-3 px-4 font-medium">제목</th>
              <th className="py-3 px-4 font-medium w-32">작성일자</th>
            </tr>
          </thead>
          <tbody>
            {NOTICES.map((n, i) => (
              <tr key={n.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="py-3 px-4 text-muted">{NOTICES.length - i}</td>
                <td className="py-3 px-4 font-medium">{n.title}</td>
                <td className="py-3 px-4 text-muted whitespace-nowrap">{n.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FaqBoard() {
  const [category, setCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = category ? FAQ_ITEMS.filter((f) => f.category === category) : FAQ_ITEMS;

  return (
    <>
      <h1 className="text-xl font-extrabold mb-1">자주묻는 질문</h1>
      <p className="text-sm text-muted mb-5">카테고리를 선택해 자주 묻는 질문을 확인하세요.</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {FAQ_CATEGORIES.map((c) => {
          const Icon = FAQ_ICONS[c.id] ?? HelpCircle;
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(active ? null : c.id)}
              className={`card p-4 flex flex-col items-center gap-2 text-center card-hover ${
                active ? "border-brand" : ""
              }`}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center ${
                  active ? "bg-brand text-white" : "bg-brand/10 text-brand"
                }`}
              >
                <Icon size={20} />
              </div>
              <span className="text-xs font-medium">{c.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card divide-y divide-border">
        {visible.map((f) => {
          const open = openId === f.id;
          return (
            <div key={f.id}>
              <button
                onClick={() => setOpenId(open ? null : f.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-surface-2"
              >
                <span className="font-medium flex items-center gap-2">
                  <span className="text-brand font-bold">Q.</span> {f.q}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <p className="px-4 pb-4 text-sm text-muted leading-relaxed">
                  <span className="text-brand font-bold">A.</span> {f.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function QnaBoard() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <h1 className="text-xl font-extrabold mb-1">1:1 문의</h1>
      <p className="text-sm text-muted mb-5">궁금하신 내용을 남겨주시면 순차적으로 답변드립니다.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="card p-5 flex flex-col gap-3"
      >
        <select
          defaultValue=""
          required
          className="h-11 px-3 rounded-lg border border-border text-sm sm:w-56 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        >
          <option value="" disabled>
            문의 유형 선택
          </option>
          {FAQ_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          required
          placeholder="제목"
          className="h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
        <textarea
          required
          rows={6}
          placeholder="문의 내용을 입력해주세요."
          className="px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand resize-none"
        />
        <button type="submit" className="btn-primary h-11 self-end px-6 gap-1.5">
          <Send size={15} /> 문의 등록
        </button>
        {submitted && (
          <p className="text-sm text-success font-medium">문의가 등록되었습니다. 순차적으로 답변드리겠습니다.</p>
        )}
      </form>

      <h2 className="font-bold mt-8 mb-3">나의 문의 내역</h2>
      <div className="card py-14 text-center text-muted text-sm">등록된 문의 내역이 없습니다.</div>
    </>
  );
}

function UpdateLogBoard() {
  return (
    <>
      <h1 className="text-xl font-extrabold mb-1">업데이트 내역</h1>
      <p className="text-sm text-muted mb-5">타이어존의 최근 기능 업데이트 소식입니다.</p>
      <div className="card divide-y divide-border">
        {UPDATE_LOGS.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="flex items-center gap-2">
              <Rss size={13} className="text-brand shrink-0" />
              {u.title}
            </span>
            <span className="text-muted text-xs shrink-0 ml-3">{u.date}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function CustomerContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "notice";

  return (
    <div className="px-4 py-5 max-w-[1440px] mx-auto flex gap-6">
      <aside className="hidden lg:flex w-48 shrink-0 flex-col gap-1 py-1">
        <p className="px-3 pb-2 text-xs font-semibold text-muted flex items-center gap-1.5">
          <Megaphone size={13} /> 고객센터
        </p>
        {CUSTOMER_LINKS.map((c) => {
          const active = c.href.includes(`tab=${tab}`);
          return (
            <Link
              key={c.href}
              href={c.href}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
                active ? "bg-brand/10 text-brand" : "text-foreground/80 hover:bg-surface-2"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex lg:hidden gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4">
          {CUSTOMER_LINKS.map((c) => {
            const active = c.href.includes(`tab=${tab}`);
            return (
              <Link
                key={c.href}
                href={c.href}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border ${
                  active ? "bg-brand text-white border-brand" : "border-border text-foreground/70"
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>

        {tab === "faq" ? (
          <FaqBoard />
        ) : tab === "qna" ? (
          <QnaBoard />
        ) : tab === "update" ? (
          <UpdateLogBoard />
        ) : (
          <NoticeTable />
        )}
      </div>
    </div>
  );
}

export default function CustomerPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingState />}>
        <CustomerContent />
      </Suspense>
    </RequireAuth>
  );
}
