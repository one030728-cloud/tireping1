"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import LoadingState from "@/components/LoadingState";
import { MANUFACTURERS } from "@/lib/mockData";
import type { CatalogRow } from "@/lib/types";
import { parseTireSize } from "@/lib/tireSearch";
import { useAuth } from "@/lib/auth";

type SortKey = "registered" | "popular" | "lowest" | "highest" | "discount";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "registered", label: "등록일순" },
  { key: "popular", label: "인기판매순" },
  { key: "lowest", label: "최저가순" },
  { key: "highest", label: "최고가순" },
  { key: "discount", label: "DC율 높은순" },
];

function sortRows(rows: CatalogRow[], sort: SortKey): CatalogRow[] {
  const copy = [...rows];
  switch (sort) {
    case "popular":
      return copy.sort((a, b) => (b.tag === "BEST" ? 1 : 0) - (a.tag === "BEST" ? 1 : 0));
    case "lowest":
      return copy.sort((a, b) => a.lowPrice - b.lowPrice);
    case "highest":
      return copy.sort((a, b) => b.highPrice - a.highPrice);
    case "discount":
      return copy.sort((a, b) => b.discountRate - a.discountRate);
    default:
      return copy.sort((a, b) => b.registeredOrder - a.registeredOrder);
  }
}

const PAGE_SIZE = 12;

function ProductsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag");

  const [size, setSize] = useState(searchParams.get("size") ?? "");
  const [manufacturer, setManufacturer] = useState(searchParams.get("manufacturer") ?? "");
  const [model, setModel] = useState("");
  const [productCode, setProductCode] = useState("");
  const [width, setWidth] = useState("");
  const [ratio, setRatio] = useState("");
  const [rim, setRim] = useState("");
  const [dot, setDot] = useState("");
  const [sort, setSort] = useState<SortKey>("registered");
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/products", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("상품 목록을 불러오지 못했습니다.");
        return response.json() as Promise<{ products: CatalogRow[] }>;
      })
      .then((data) => {
        if (!cancelled) setCatalog(data.products);
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

  const results = useMemo(() => {
    const parsedSize = parseTireSize(size);
    const hasInvalidSize = size.trim().length > 0 && !parsedSize;
    const filtered = catalog.filter((r) => {
      if (hasInvalidSize) return false;
      if (tag && r.tag !== tag) return false;
      if (manufacturer && r.manufacturer !== manufacturer) return false;
      if (model && !r.model.toLowerCase().includes(model.toLowerCase())) return false;
      if (productCode && !r.productCode.toLowerCase().includes(productCode.toLowerCase()))
        return false;
      if (width && r.width !== Number(width)) return false;
      if (ratio && r.ratio !== Number(ratio)) return false;
      if (rim && r.rim !== Number(rim)) return false;
      if (dot && r.dot !== dot) return false;
      if (parsedSize && r.width !== parsedSize.width) return false;
      if (parsedSize && r.ratio !== parsedSize.ratio) return false;
      if (parsedSize && r.rim !== parsedSize.rim) return false;
      return true;
    });
    return sortRows(filtered, sort);
  }, [catalog, tag, manufacturer, model, productCode, width, ratio, rim, dot, size, sort]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pageRows = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  if (loading) return <LoadingState />;

  if (loadError) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-muted mb-4">상품 목록을 불러오지 못했습니다.</p>
        <button className="btn-outline" onClick={() => window.location.reload()}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-4">
        {tag === "EVENT" ? "이벤트 상품목록" : "일반 상품목록"}
      </h1>

      <div className="card p-4 mb-3 flex flex-col gap-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input
            value={size}
            onChange={(e) => {
              setSize(e.target.value);
              resetPage();
            }}
            placeholder="사이즈 검색 예) 245 45 18"
            className="h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand col-span-2 sm:col-span-1"
          />
          <select
            value={manufacturer}
            onChange={(e) => {
              setManufacturer(e.target.value);
              resetPage();
            }}
            className="h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          >
            <option value="">제조사</option>
            {MANUFACTURERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              resetPage();
            }}
            placeholder="제품명"
            className="h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <input
            value={productCode}
            onChange={(e) => {
              setProductCode(e.target.value);
              resetPage();
            }}
            placeholder="제품번호(형용코드)"
            className="h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input
            value={width}
            onChange={(e) => {
              setWidth(e.target.value);
              resetPage();
            }}
            placeholder="단면폭"
            inputMode="numeric"
            className="h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <input
            value={ratio}
            onChange={(e) => {
              setRatio(e.target.value);
              resetPage();
            }}
            placeholder="편평비"
            inputMode="numeric"
            className="h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <input
            value={rim}
            onChange={(e) => {
              setRim(e.target.value);
              resetPage();
            }}
            placeholder="인치"
            inputMode="numeric"
            className="h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <input
            value={dot}
            onChange={(e) => {
              setDot(e.target.value);
              resetPage();
            }}
            placeholder="DOT 예) 2025"
            className="h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm text-muted">
          총 <b className="text-foreground">{results.length}</b>개 상품
        </p>
        <div className="flex items-center gap-3 text-xs">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setSort(s.key);
                resetPage();
              }}
              className={`font-medium ${sort === s.key ? "text-brand" : "text-muted hover:text-foreground"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {pageRows.length === 0 ? (
        <div className="card text-center text-muted py-16 text-sm">
          <SearchX size={32} className="mx-auto mb-3 text-border" strokeWidth={1.5} />
          조건에 맞는 타이어가 없습니다.
        </div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto card">
            <table className="min-w-[960px] w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-3 px-4 font-medium">제조사</th>
                  <th className="py-3 px-4 font-medium">제품정보</th>
                  <th className="py-3 px-4 font-medium">사이즈</th>
                  <th className="py-3 px-4 font-medium">세부정보</th>
                  <th className="py-3 px-4 font-medium">제품번호</th>
                  <th className="py-3 px-4 font-medium">생산년도</th>
                  <th className="py-3 px-4 font-medium">공장도가</th>
                  <th className="py-3 px-4 font-medium">최저가</th>
                  <th className="py-3 px-4 font-medium">최고가</th>
                  <th className="py-3 px-4 font-medium">재고수량</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="py-3 px-4">{r.manufacturer}</td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/products/${r.detailId}${r.detailDot ? `?dot=${r.detailDot}` : ""}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {r.model}
                      </Link>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {r.width} / {r.ratio} R {r.rim}
                    </td>
                    <td className="py-3 px-4 text-muted">{r.spec}</td>
                    <td className="py-3 px-4 text-muted">{r.productCode}</td>
                    <td className="py-3 px-4 text-muted">{r.dot}</td>
                    <td className="py-3 px-4 tabular-nums text-muted">
                      {user ? `${r.factoryPrice.toLocaleString()}원` : "로그인 후 공개"}
                    </td>
                    <td className="py-3 px-4 tabular-nums font-bold text-brand">
                      {user ? `${r.lowPrice.toLocaleString()}원` : "로그인 후 공개"}
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      {user ? `${r.highPrice.toLocaleString()}원` : "로그인 후 공개"}
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      {user ? r.stock.toLocaleString() : "로그인 후 공개"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden flex flex-col gap-3">
            {pageRows.map((r) => (
              <Link
                key={r.id}
                href={`/products/${r.detailId}${r.detailDot ? `?dot=${r.detailDot}` : ""}`}
                className="card p-4 block"
              >
                <p className="text-xs text-muted mb-0.5">{r.manufacturer}</p>
                <p className="font-semibold">{r.model}</p>
                <p className="text-xs text-muted mt-1">
                  {r.width} / {r.ratio} R {r.rim} · DOT {r.dot}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted">
                    {user ? `재고 ${r.stock}` : "재고 로그인 후 공개"}
                  </span>
                  <span className="font-extrabold text-brand tabular-nums">
                    {user ? `${r.lowPrice.toLocaleString()}원` : "로그인 후 가격 확인"}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-6">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${
                    p === page ? "bg-brand text-white" : "text-muted hover:bg-surface-2"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProductsContent />
    </Suspense>
  );
}
