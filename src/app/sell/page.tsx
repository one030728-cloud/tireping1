"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Package, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListings } from "@/lib/listings";
import { MANUFACTURERS } from "@/lib/mockData";
import type { Manufacturer } from "@/lib/types";

function GuestSell() {
  return (
    <div className="px-4 py-16 flex justify-center">
      <div className="w-full max-w-md card rounded-2xl p-8 text-center flex flex-col items-center gap-3 relative overflow-hidden animate-[fade-slide-up_400ms_ease-out_both]">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand/5 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-accent/5 blur-2xl" />
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-light to-brand-dark text-white flex items-center justify-center relative shadow-[var(--shadow-brand)]">
          <Package size={26} />
        </div>
        <p className="font-bold text-lg relative">타이어를 등록하고 전국 사업자에게 판매하세요</p>
        <p className="text-sm text-muted relative">
          타이어존은 사업자 전용 B2B 타이어 거래 플랫폼입니다. 로그인 후 보유 재고를 등록하고 바로
          판매를 시작할 수 있습니다.
        </p>
        <Link href="/login" className="btn-primary relative h-11 px-6 mt-2">
          로그인하고 판매 시작하기
        </Link>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  manufacturer: MANUFACTURERS[0] as Manufacturer,
  model: "",
  width: "",
  ratio: "",
  rim: "",
  dot: "",
  price: "",
  stock: "",
};

function SellContent() {
  const { listings, addListing, removeListing, toggleStatus } = useListings();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const onSaleCount = listings.filter((l) => l.status === "판매중").length;
  const soldOutCount = listings.filter((l) => l.status === "품절").length;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    addListing({
      manufacturer: form.manufacturer,
      model: form.model,
      width: Number(form.width),
      ratio: Number(form.ratio),
      rim: Number(form.rim),
      dot: form.dot || String(new Date().getFullYear()),
      price: Number(form.price),
      stock: Number(form.stock),
    });
    setForm(EMPTY_FORM);
    setFormOpen(false);
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-1">타이어판매</h1>
      <p className="text-sm text-muted mb-5">
        등록한 타이어 재고를 관리하고 판매 상태를 변경하세요.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="card p-4 text-center">
          <p className="text-xs text-muted mb-1">전체 등록</p>
          <p className="text-lg font-extrabold tabular-nums">{listings.length}건</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-muted mb-1">판매중</p>
          <p className="text-lg font-extrabold tabular-nums text-brand">{onSaleCount}건</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-muted mb-1">품절</p>
          <p className="text-lg font-extrabold tabular-nums text-muted">{soldOutCount}건</p>
        </div>
      </div>

      <Dialog.Root open={formOpen} onOpenChange={setFormOpen}>
        <Dialog.Trigger asChild>
          <button className="btn-primary h-11 px-5 mb-5 gap-1.5">
            <Plus size={16} /> 신규 타이어 등록
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 data-[state=open]:animate-[overlay-show_200ms_ease-out] data-[state=closed]:animate-[overlay-hide_180ms_ease-in]" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm card rounded-2xl p-6 z-50 shadow-[var(--shadow-lg)] data-[state=open]:animate-[fade-slide-up_220ms_ease-out_both]"
          >
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="font-bold text-lg">신규 타이어 등록</Dialog.Title>
              <Dialog.Close asChild>
                <button aria-label="닫기" className="p-1 text-muted hover:text-foreground">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <select
                value={form.manufacturer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, manufacturer: e.target.value as Manufacturer }))
                }
                className="h-11 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              >
                {MANUFACTURERS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                required
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="모델명"
                className="h-11 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  required
                  type="number"
                  value={form.width}
                  onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))}
                  placeholder="폭"
                  className="h-11 px-2 rounded-lg border border-border text-center focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                />
                <input
                  required
                  type="number"
                  value={form.ratio}
                  onChange={(e) => setForm((f) => ({ ...f, ratio: e.target.value }))}
                  placeholder="편평비"
                  className="h-11 px-2 rounded-lg border border-border text-center focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                />
                <input
                  required
                  type="number"
                  value={form.rim}
                  onChange={(e) => setForm((f) => ({ ...f, rim: e.target.value }))}
                  placeholder="림"
                  className="h-11 px-2 rounded-lg border border-border text-center focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                />
              </div>
              <input
                value={form.dot}
                onChange={(e) => setForm((f) => ({ ...f, dot: e.target.value }))}
                placeholder="생산년도 (DOT), 예: 2025"
                className="h-11 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="판매가"
                  className="h-11 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                />
                <input
                  required
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  placeholder="재고수량"
                  className="h-11 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                />
              </div>
              <button type="submit" className="btn-primary h-11 mt-2">
                등록하기
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {listings.length === 0 ? (
        <div className="card py-16 text-center text-muted animate-[fade-slide-up_400ms_ease-out_both]">
          <Package size={32} className="mx-auto mb-3 text-border" strokeWidth={1.5} />
          등록된 판매 타이어가 없습니다.
        </div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto card">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-3 px-4 font-medium">제조사</th>
                  <th className="py-3 px-4 font-medium">모델</th>
                  <th className="py-3 px-4 font-medium">사이즈</th>
                  <th className="py-3 px-4 font-medium">판매가</th>
                  <th className="py-3 px-4 font-medium">재고</th>
                  <th className="py-3 px-4 font-medium">등록일</th>
                  <th className="py-3 px-4 font-medium">상태</th>
                  <th className="py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border last:border-0 hover:bg-surface-2"
                  >
                    <td className="py-3 px-4">{l.manufacturer}</td>
                    <td className="py-3 px-4 font-medium">{l.model}</td>
                    <td className="py-3 px-4">
                      {l.width}/{l.ratio}R{l.rim} · DOT {l.dot}
                    </td>
                    <td className="py-3 px-4 font-semibold tabular-nums">
                      {l.price.toLocaleString()}원
                    </td>
                    <td className="py-3 px-4 tabular-nums">{l.stock}</td>
                    <td className="py-3 px-4">{l.registeredAt}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleStatus(l.id)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-full ${
                          l.status === "판매중"
                            ? "bg-brand/10 text-brand"
                            : "bg-muted/10 text-muted"
                        }`}
                      >
                        {l.status}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => removeListing(l.id)}
                        aria-label="삭제"
                        className="text-muted hover:text-accent"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden flex flex-col gap-3">
            {listings.map((l, i) => (
              <div
                key={l.id}
                className="card card-hover p-4 animate-[fade-slide-up_400ms_ease-out_both]"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-muted mb-0.5">
                      {l.manufacturer} · {l.registeredAt}
                    </p>
                    <p className="font-semibold">{l.model}</p>
                    <p className="text-xs text-muted mt-1">
                      {l.width} / {l.ratio} R {l.rim} · DOT {l.dot}
                    </p>
                  </div>
                  <button
                    onClick={() => removeListing(l.id)}
                    aria-label="삭제"
                    className="text-muted hover:text-accent shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold tabular-nums">
                    {l.price.toLocaleString()}원{" "}
                    <span className="text-xs font-normal text-muted">· 재고 {l.stock}</span>
                  </span>
                  <button
                    onClick={() => toggleStatus(l.id)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-full ${
                      l.status === "판매중" ? "bg-brand/10 text-brand" : "bg-muted/10 text-muted"
                    }`}
                  >
                    {l.status}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SellPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-10 text-center text-muted">불러오는 중...</div>;
  }

  if (!user) {
    return <GuestSell />;
  }

  return <SellContent />;
}
