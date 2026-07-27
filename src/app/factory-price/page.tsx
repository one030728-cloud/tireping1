"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { FACTORY_TIRES, MANUFACTURERS } from "@/lib/mockData";

function FactoryPriceContent() {
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [restockRequested, setRestockRequested] = useState<string[]>([]);

  function toggleManufacturer(m: string) {
    setManufacturers((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  const groups = useMemo(() => {
    return FACTORY_TIRES.filter((g) => {
      if (manufacturers.length > 0 && !manufacturers.includes(g.manufacturer)) return false;
      if (inStockOnly && g.rows.every((r) => r.stock === 0)) return false;
      return true;
    });
  }, [manufacturers, inStockOnly]);

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-1">공장도가 확인</h1>
      <p className="text-sm text-muted mb-5">타이어의 공장도가를 손쉽게 확인하세요!</p>

      <div className="card p-4 mb-5">
        <p className="text-xs text-muted mb-2">제조사</p>
        <div className="flex flex-wrap gap-x-2 gap-y-1 mb-4">
          {MANUFACTURERS.map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-sm py-1.5 px-1.5 -mx-1.5">
              <input
                type="checkbox"
                checked={manufacturers.includes(m)}
                onChange={() => toggleManufacturer(m)}
                className="w-4 h-4"
              />
              {m}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm py-1.5 -mx-1.5 px-1.5 w-fit">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="w-4 h-4"
          />
          재고 있는 상품만
        </label>
      </div>

      <p className="text-sm text-muted mb-3">총 {groups.length}개의 상품</p>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-4">
        {groups.map((g, i) => (
          <div
            key={g.id}
            className="card card-hover p-4 animate-[fade-slide-up_400ms_ease-out_both]"
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
          >
            <div className="flex items-start gap-3 mb-3">
              <ImagePlaceholder className="w-16 h-16 shrink-0" manufacturer={g.manufacturer} />
              <div className="flex-1 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted mb-0.5">{g.manufacturer}</p>
                  <p className="font-bold">{g.model}</p>
                  <p className="text-xs text-muted mt-1">
                    {g.width}/{g.ratio}R{g.rim} {g.spec}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted">공장도가</p>
                  <p className="font-bold">{g.factoryPrice.toLocaleString()}원</p>
                </div>
              </div>
            </div>

            {g.rows.length === 0 ? (
              <div className="bg-background rounded-lg p-3 flex items-center justify-between text-sm">
                <span className="text-muted">판매중인 상품의 재고가 없습니다.</span>
                <button
                  disabled={restockRequested.includes(g.id)}
                  onClick={() => setRestockRequested((prev) => [...prev, g.id])}
                  className="text-xs font-semibold text-brand border border-brand rounded-md px-3 py-1.5 hover:bg-brand/5 active:scale-95 disabled:opacity-50 disabled:text-muted disabled:border-border disabled:active:scale-100"
                >
                  {restockRequested.includes(g.id) ? "요청완료" : "재고 입고요청"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {g.rows.map((r) => (
                  <Link
                    key={r.dot}
                    href={`/products/${g.id}?dot=${r.dot}`}
                    className="flex flex-col gap-0.5 bg-background rounded-lg px-3 py-2 text-sm hover:bg-brand/5 hover:-translate-y-0.5 active:scale-95"
                  >
                    <span className="text-muted text-xs">DOT {r.dot}</span>
                    <span className="text-brand font-bold">{r.discountRate}%</span>
                    <span className="font-semibold">{r.price.toLocaleString()}원</span>
                    <span className="text-muted text-[11px]">재고 {r.stock.toLocaleString()}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FactoryPricePage() {
  return (
    <RequireAuth>
      <FactoryPriceContent />
    </RequireAuth>
  );
}
