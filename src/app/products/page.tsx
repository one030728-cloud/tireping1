"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import TireCard from "@/components/TireCard";
import { MANUFACTURERS, TIRES } from "@/lib/mockData";

function ProductsContent() {
  const searchParams = useSearchParams();
  const [manufacturer, setManufacturer] = useState(searchParams.get("manufacturer") ?? "");
  const [size, setSize] = useState(searchParams.get("size") ?? "");

  const results = useMemo(() => {
    const sizeParts = size.trim().split(/\s+/).filter(Boolean).map(Number);
    return TIRES.filter((t) => {
      if (manufacturer && t.manufacturer !== manufacturer) return false;
      if (sizeParts.length >= 1 && !Number.isNaN(sizeParts[0]) && t.width !== sizeParts[0])
        return false;
      if (sizeParts.length >= 2 && !Number.isNaN(sizeParts[1]) && t.ratio !== sizeParts[1])
        return false;
      if (sizeParts.length >= 3 && !Number.isNaN(sizeParts[2]) && t.rim !== sizeParts[2])
        return false;
      return true;
    });
  }, [manufacturer, size]);

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-4">타이어 검색</h1>

      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          className="h-11 px-3 rounded-lg border border-border sm:w-40"
        >
          <option value="">제조사</option>
          {MANUFACTURERS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="사이즈 검색 245 45 18"
          className="h-11 px-3 rounded-lg border border-border flex-1"
        />
      </div>

      <p className="text-sm text-muted mb-3">총 {results.length}개 상품</p>

      {results.length === 0 ? (
        <p className="text-center text-muted py-16 text-sm">조건에 맞는 타이어가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {results.map((t) => (
            <TireCard key={t.id} tire={t} fixedWidth={false} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="p-10 text-center text-muted">불러오는 중...</div>}>
        <ProductsContent />
      </Suspense>
    </RequireAuth>
  );
}
