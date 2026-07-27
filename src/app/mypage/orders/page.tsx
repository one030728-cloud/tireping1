"use client";

import RequireAuth from "@/components/RequireAuth";
import { useOrders } from "@/lib/orders";

function OrdersDetailContent() {
  const { orders } = useOrders();
  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-1">주문내역 / 배송조회</h1>
      <p className="text-sm text-muted mb-5">총 {orders.length}건</p>

      <div className="card p-4 overflow-x-auto">
        <table className="min-w-[820px] w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-2 pr-3 font-medium">통합주문번호</th>
              <th className="py-2 pr-3 font-medium">주문상태</th>
              <th className="py-2 pr-3 font-medium">제조사</th>
              <th className="py-2 pr-3 font-medium">주문상품</th>
              <th className="py-2 pr-3 font-medium">공장도가</th>
              <th className="py-2 pr-3 font-medium">단가</th>
              <th className="py-2 pr-3 font-medium">수량</th>
              <th className="py-2 pr-3 font-medium">추가배송비</th>
              <th className="py-2 pr-3 font-medium">합계금액</th>
              <th className="py-2 pr-3 font-medium">판매점</th>
              <th className="py-2 pr-3 font-medium">주문일자</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border hover:bg-surface-2">
                <td className="py-3 pr-3 text-brand font-semibold">{o.id}</td>
                <td className="py-3 pr-3">
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      o.status === "구매확정" ? "bg-brand/10 text-brand" : "bg-muted/10 text-muted"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="py-3 pr-3">{o.manufacturer}</td>
                <td className="py-3 pr-3">
                  <p className="font-medium">{o.model}</p>
                  <p className="text-muted">
                    {o.width}/{o.ratio}R{o.rim}
                  </p>
                </td>
                <td className="py-3 pr-3">{o.factoryPrice.toLocaleString()}원</td>
                <td className="py-3 pr-3">{o.unitPrice.toLocaleString()}원</td>
                <td className="py-3 pr-3">{o.quantity}개</td>
                <td className="py-3 pr-3">{o.extraShipping.toLocaleString()}원</td>
                <td className="py-3 pr-3 font-semibold">{o.total.toLocaleString()}원</td>
                <td className="py-3 pr-3">{o.sellerCode}</td>
                <td className="py-3 pr-3 whitespace-nowrap">{o.orderedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OrdersDetailPage() {
  return (
    <RequireAuth>
      <OrdersDetailContent />
    </RequireAuth>
  );
}
