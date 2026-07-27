"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { useOrders } from "@/lib/orders";

const STATUS_STYLE: Record<string, string> = {
  입금대기: "bg-accent/10 text-accent",
  입금완료: "bg-brand/10 text-brand",
  주문확인: "bg-brand/10 text-brand",
  배송준비중: "bg-brand/10 text-brand",
  배송중: "bg-brand/10 text-brand",
  배송완료: "bg-green-500/10 text-green-600",
  구매확정: "bg-green-500/10 text-green-600",
  입금후취소: "bg-muted/10 text-muted",
  입금전취소: "bg-muted/10 text-muted",
};

function OrdersContent() {
  const { orders } = useOrders();
  const searchParams = useSearchParams();
  const justOrdered = searchParams.get("justOrdered") === "1";

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-1">주문내역</h1>
      <p className="text-sm text-muted mb-5">전체 {orders.length}건의 주문내역이 있습니다.</p>

      {justOrdered && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-brand/10 text-brand text-sm font-semibold">
          주문이 완료되었습니다. 입금 확인 후 순차적으로 처리됩니다.
        </div>
      )}

      {orders.length === 0 ? (
        <p className="text-center text-muted py-16">주문 내역이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o, i) => (
            <div
              key={o.id}
              className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 animate-[fade-slide-up_400ms_ease-out_both]"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <div>
                <p className="text-xs text-muted mb-1">
                  주문번호 {o.id} · {o.orderedAt}
                </p>
                <p className="font-semibold">{o.model}</p>
                <p className="text-sm text-muted mt-1 tabular-nums">
                  {o.total.toLocaleString()}원
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-full ${STATUS_STYLE[o.status] ?? "bg-muted/10 text-muted"}`}
              >
                {o.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="p-10 text-center text-muted">불러오는 중...</div>}>
        <OrdersContent />
      </Suspense>
    </RequireAuth>
  );
}
