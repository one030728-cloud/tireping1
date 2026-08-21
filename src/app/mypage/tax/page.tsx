"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import LoadingState from "@/components/LoadingState";
import type { SettlementView } from "@/lib/settlement-types";

function TaxContent() {
  const [settlement, setSettlement] = useState<SettlementView | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/account/settlement", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("세금계산서 집계를 불러오지 못했습니다.");
        return response.json() as Promise<{ settlement: SettlementView }>;
      })
      .then((data) => {
        if (cancelled) return;
        setSettlement(data.settlement);
        // Guard against an empty dataset instead of assuming taxYears[0]
        // exists — a buyer with no paid orders yet has an empty taxYears
        // array, and reading [0] on that would previously have crashed the
        // page (see the old YEARS[0] default state).
        setYear(data.settlement.taxYears[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingState />;

  if (loadError || !settlement) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-muted mb-4">세금계산서 집계를 불러오지 못했습니다.</p>
        <button className="btn-outline" onClick={() => window.location.reload()}>
          다시 시도
        </button>
      </div>
    );
  }

  if (settlement.scope === "NOT_APPLICABLE") {
    return (
      <div className="px-4 py-5">
        <h1 className="text-xl font-extrabold mb-5">세금계산서 내역</h1>
        <div className="card p-10 text-center text-muted text-sm">{settlement.scopeMessage}</div>
      </div>
    );
  }

  const { taxYears, taxByYear } = settlement;
  const records = year ? (taxByYear[year] ?? []) : [];
  const totalSupply = records.reduce((s, r) => s + r.supplyAmount, 0);
  const totalVat = records.reduce((s, r) => s + r.vat, 0);
  const totalSum = records.reduce((s, r) => s + r.total, 0);

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-1">세금계산서 내역</h1>
      {/* This app never issues a 세금계산서 and has no 국세청 연동 — the table
          below is a 월별 결제금액 집계 (참고용) computed from the buyer's own
          paid orders, not an issued tax invoice. That must stay unmistakable
          here so an operator or 세무 담당자 never treats this screen as an
          official invoice record. */}
      <p className="text-xs text-accent font-semibold mb-5">
        ※ 실제 발행된 세금계산서가 아니며, 결제 금액을 기준으로 한 월별 집계(참고용)입니다.
      </p>

      {taxYears.length === 0 ? (
        <div className="card p-10 text-center text-muted text-sm">집계할 결제 내역이 없습니다.</div>
      ) : (
        <>
          <div className="flex gap-2 mb-5 overflow-x-auto">
            {taxYears.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold shrink-0 active:scale-95 transition-all ${
                  year === y
                    ? "bg-gradient-to-r from-brand-light to-brand text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.55)]"
                    : "bg-surface border border-border text-muted hover:text-brand hover:border-brand/50"
                }`}
              >
                {y}년
              </button>
            ))}
          </div>

          <div className="card p-4 overflow-x-auto">
            <table className="min-w-[480px] w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-2 pr-3 font-medium">년-월</th>
                  <th className="py-2 pr-3 font-medium">공급가액</th>
                  <th className="py-2 pr-3 font-medium">부가세액</th>
                  <th className="py-2 pr-3 font-medium">합계금액</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.month} className="border-b border-border hover:bg-surface-2">
                    <td className="py-3 pr-3">{r.month}</td>
                    <td className="py-3 pr-3">{r.supplyAmount.toLocaleString()}원</td>
                    <td className="py-3 pr-3">{r.vat.toLocaleString()}원</td>
                    <td className="py-3 pr-3 font-semibold">{r.total.toLocaleString()}원</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-3 pr-3">총 합계</td>
                  <td className="py-3 pr-3">{totalSupply.toLocaleString()}원</td>
                  <td className="py-3 pr-3">{totalVat.toLocaleString()}원</td>
                  <td className="py-3 pr-3">{totalSum.toLocaleString()}원</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function TaxPage() {
  return (
    <RequireAuth>
      <TaxContent />
    </RequireAuth>
  );
}
