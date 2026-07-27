"use client";

import RequireAuth from "@/components/RequireAuth";
import { DEPOSITS } from "@/lib/mockData";

function DepositsContent() {
  const total = DEPOSITS.reduce((sum, d) => sum + (d.paidAmount ?? 0) - (d.refundAmount ?? 0), 0);

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-1">입출금 내역</h1>
      <p className="text-sm text-muted mb-1">총 {DEPOSITS.length}건</p>
      <p className="text-sm font-semibold mb-5">
        합계 : <span className="text-brand">{total.toLocaleString()}원</span>
      </p>

      <div className="card p-4 overflow-x-auto">
        <table className="min-w-[600px] w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-2 pr-3 font-medium">통합주문번호</th>
              <th className="py-2 pr-3 font-medium">주문상품</th>
              <th className="py-2 pr-3 font-medium">결제 금액</th>
              <th className="py-2 pr-3 font-medium">환불 금액</th>
              <th className="py-2 pr-3 font-medium">주문일자</th>
            </tr>
          </thead>
          <tbody>
            {DEPOSITS.map((d) => (
              <tr
                key={`${d.orderId}-${d.date}`}
                className="border-b border-border hover:bg-surface-2"
              >
                <td className="py-3 pr-3 text-brand font-semibold">{d.orderId}</td>
                <td className="py-3 pr-3">{d.itemLabel}</td>
                <td className="py-3 pr-3">
                  {d.paidAmount ? `${d.paidAmount.toLocaleString()}원` : "-"}
                </td>
                <td className="py-3 pr-3">
                  {d.refundAmount ? `${d.refundAmount.toLocaleString()}원` : "-"}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap">{d.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DepositsPage() {
  return (
    <RequireAuth>
      <DepositsContent />
    </RequireAuth>
  );
}
