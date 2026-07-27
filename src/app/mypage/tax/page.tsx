"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { TAX_RECORDS } from "@/lib/mockData";

const YEARS = Object.keys(TAX_RECORDS).sort((a, b) => Number(b) - Number(a));

function TaxContent() {
  const [year, setYear] = useState(YEARS[0]);
  const records = TAX_RECORDS[year] ?? [];
  const totalSupply = records.reduce((s, r) => s + r.supplyAmount, 0);
  const totalVat = records.reduce((s, r) => s + r.vat, 0);
  const totalSum = records.reduce((s, r) => s + r.total, 0);

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-5">세금계산서 내역</h1>

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold shrink-0 active:scale-95 transition-all ${
              year === y
                ? "bg-gradient-to-r from-brand-light to-brand text-white shadow-[0_4px_14px_-4px_rgba(29,93,240,0.5)]"
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
              <tr key={r.month} className="border-b border-border hover:bg-background">
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
