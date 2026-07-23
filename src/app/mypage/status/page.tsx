"use client";

import RequireAuth from "@/components/RequireAuth";
import { useOrders } from "@/lib/orders";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 text-center">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-lg font-extrabold">{value}건</p>
    </div>
  );
}

function StatusContent() {
  const { orderStatusCounts, cancelStatusCounts } = useOrders();
  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-5">주문 / 배송 현황</h1>

      <h2 className="font-bold mb-3">타이어 주문 현황</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
        {Object.entries(orderStatusCounts).map(([label, value]) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>

      <h2 className="font-bold mb-3">타이어 취소/교환/반품 현황</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
        {Object.entries(cancelStatusCounts).map(([label, value]) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

export default function OrderStatusPage() {
  return (
    <RequireAuth>
      <StatusContent />
    </RequireAuth>
  );
}
