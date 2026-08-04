"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, PackageSearch } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import LoadingState from "@/components/LoadingState";
import { OrderRequestError, useOrders } from "@/lib/orders";
import { CANCEL_STATUS } from "@/lib/order-status";
import { getStatusStyle } from "@/lib/status";

function OrdersContent() {
  const { orders, cancelOrder } = useOrders();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const justOrdered = searchParams.get("justOrdered") === "1";

  async function handleCancel(id: string) {
    if (!window.confirm("이 주문을 취소하시겠습니까?")) return;
    setCancellingId(id);
    try {
      await cancelOrder(id);
    } catch (error) {
      const code = error instanceof OrderRequestError ? error.code : "ORDER_REQUEST_FAILED";
      window.alert(
        code === "CANCEL_AFTER_SHIPPING"
          ? "발송이 시작된 주문은 주문 취소를 할 수 없습니다."
          : "주문 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-1">주문내역</h1>
      <p className="text-sm text-muted mb-5">전체 {orders.length}건의 주문내역이 있습니다.</p>

      {justOrdered && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-brand/10 text-brand text-sm font-semibold flex items-center gap-2 animate-[slide-in-from-top_300ms_ease-out]">
          <CheckCircle2 size={18} className="shrink-0" />
          주문이 완료되었습니다. 입금 확인 후 순차적으로 처리됩니다.
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card text-center text-muted py-16 animate-[fade-slide-up_400ms_ease-out_both]">
          <PackageSearch size={32} className="mx-auto mb-3 text-border" strokeWidth={1.5} />
          주문 내역이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o, i) => (
            <div
              key={o.id}
              className="card p-4 flex items-center justify-between animate-[fade-slide-up_400ms_ease-out_both]"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <div>
                <p className="text-xs text-muted mb-1">
                  주문번호 {o.id} · {o.orderedAt}
                </p>
                <p className="font-semibold">{o.model}</p>
                <p className="text-sm text-muted mt-1 tabular-nums">{o.total.toLocaleString()}원</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-full ${getStatusStyle(o.status)}`}
                >
                  {o.status}
                </span>
                {o.shippingStatusLabel && <span className="text-xs text-muted">{o.shippingStatusLabel}</span>}
                {o.shippingStatus !== "SHIPPED" &&
                  o.shippingStatus !== "DELIVERED" &&
                  !Object.values(CANCEL_STATUS).includes(o.status as (typeof CANCEL_STATUS)[keyof typeof CANCEL_STATUS]) && (
                    <button
                      type="button"
                      onClick={() => void handleCancel(o.id)}
                      disabled={cancellingId === o.id}
                      className="text-xs text-muted underline underline-offset-2 hover:text-accent disabled:opacity-50"
                    >
                      {cancellingId === o.id ? "취소 중..." : "주문 취소"}
                    </button>
                  )}
              </div>
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
      <Suspense fallback={<LoadingState />}>
        <OrdersContent />
      </Suspense>
    </RequireAuth>
  );
}
