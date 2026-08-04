"use client";

import { useEffect, useState } from "react";
import LoadingState from "@/components/LoadingState";
import type { SellerOrderView, SellerShippingStatus } from "@/lib/seller-types";

const shippingLabels: Record<SellerShippingStatus, string> = {
  PREPARING: "배송 준비중",
  TRACKING_REGISTERED: "송장번호 입력",
  SHIPPED: "발송 완료",
  DELIVERED: "배송 완료",
};

const nextAction: Partial<Record<SellerShippingStatus, { status: SellerShippingStatus; label: string }>> = {
  PREPARING: { status: "TRACKING_REGISTERED", label: "송장번호 등록" },
  TRACKING_REGISTERED: { status: "SHIPPED", label: "발송 완료 처리" },
  SHIPPED: { status: "DELIVERED", label: "배송 완료 처리" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [couriers, setCouriers] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadOrders() {
    const response = await fetch("/api/seller/orders", { cache: "no-store" });
    if (!response.ok) throw new Error("주문 정보를 불러오지 못했습니다.");
    const data = (await response.json()) as { orders: SellerOrderView[] };
    setOrders(data.orders);
    setTracking((current) => ({
      ...current,
      ...Object.fromEntries(data.orders.map((order) => [order.id, order.trackingNumber ?? ""])),
    }));
    setCouriers((current) => ({
      ...current,
      ...Object.fromEntries(data.orders.map((order) => [order.id, order.courier ?? ""])),
    }));
  }

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial API hydration is intentionally applied after mount
    loadOrders()
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function updateShipping(order: SellerOrderView) {
    const action = nextAction[order.shippingStatus];
    if (!action) return;
    setBusyId(order.id);
    setError(null);
    const response = await fetch(`/api/seller/orders/${order.id}/shipping`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shippingStatus: action.status,
        courier: couriers[order.id] ?? "",
        trackingNumber: tracking[order.id] ?? "",
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error === "TRACKING_NUMBER_REQUIRED" ? "송장번호를 먼저 입력해 주세요." : "배송 상태를 변경하지 못했습니다.");
      setBusyId(null);
      return;
    }
    await loadOrders();
    setBusyId(null);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="px-4 py-5 max-w-7xl">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold">주문 관리</h1>
        <p className="text-sm text-muted mt-1">내 상품에 접수된 주문을 확인하고 배송 상태를 처리하세요.</p>
      </div>
      {error && <p className="text-sm text-accent mb-3">{error}</p>}

      {orders.length === 0 ? (
        <div className="card py-16 text-center text-sm text-muted">아직 접수된 주문이 없습니다.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const action = nextAction[order.shippingStatus];
            return (
              <article key={order.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4 mb-4">
                  <div>
                    <p className="text-xs text-muted">주문번호 {order.id}</p>
                    <h2 className="font-bold mt-1">{order.product.manufacturer} {order.product.model}</h2>
                    <p className="text-sm text-muted mt-1">
                      {order.product.width}/{order.product.ratio} R {order.product.rim} · DOT {order.product.dot} · {order.quantity}개
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-brand">{shippingLabels[order.shippingStatus]}</span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted mb-1">구매자</p>
                    <p className="font-medium">{order.buyer.businessName} / {order.buyer.ownerName}</p>
                    <p className="text-muted mt-1">{order.buyer.mobilePhone}</p>
                    <p className="text-muted">{order.buyer.postalCode ?? ""} {order.buyer.address ?? "주소 미입력"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">주문 금액</p>
                    <p className="font-bold tabular-nums">{order.total.toLocaleString()}원</p>
                    <p className="text-muted mt-1">{formatDate(order.orderedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">배송 처리</p>
                    <div className="flex flex-col gap-2">
                      <input
                        value={couriers[order.id] ?? ""}
                        onChange={(event) => setCouriers((current) => ({ ...current, [order.id]: event.target.value }))}
                        placeholder="택배사"
                        className="seller-input"
                        disabled={!action}
                      />
                      <input
                        value={tracking[order.id] ?? ""}
                        onChange={(event) => setTracking((current) => ({ ...current, [order.id]: event.target.value }))}
                        placeholder="송장번호"
                        className="seller-input"
                        disabled={!action}
                      />
                      {action && (
                        <button onClick={() => void updateShipping(order)} disabled={busyId === order.id} className="btn-primary h-10 text-sm">
                          {busyId === order.id ? "처리 중..." : action.label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
