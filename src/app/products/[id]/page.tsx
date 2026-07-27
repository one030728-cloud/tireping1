"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, Star } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { FACTORY_TIRES, TIRES, TIRE_SPECS, getSellersForTire } from "@/lib/mockData";
import { useCart } from "@/lib/cart";
import { useOrders } from "@/lib/orders";
import { useWishlist } from "@/lib/wishlist";
import type { Manufacturer, Seller } from "@/lib/types";

interface ProductView {
  id: string;
  manufacturer: Manufacturer;
  model: string;
  width: number;
  ratio: number;
  rim: number;
  dot: string;
  factoryPrice: number;
  spec: {
    loadIndex: string;
    speedIndex: string;
    ply: string;
    origin: string;
    season: string;
    productCode: string;
  };
  sellers: Seller[];
}

const FALLBACK_SPEC = {
  loadIndex: "-",
  speedIndex: "-",
  ply: "-",
  origin: "-",
  season: "사계절",
  productCode: "-",
};

function resolveProduct(id: string, dot: string | null): ProductView | null {
  const tire = TIRES.find((t) => t.id === id);
  if (tire) {
    return {
      id: tire.id,
      manufacturer: tire.manufacturer,
      model: tire.model,
      width: tire.width,
      ratio: tire.ratio,
      rim: tire.rim,
      dot: dot ?? tire.dot,
      factoryPrice: Math.round(tire.price / (1 - tire.discountRate / 100) / 100) * 100,
      spec: TIRE_SPECS[tire.id] ?? FALLBACK_SPEC,
      sellers: getSellersForTire(tire),
    };
  }

  const group = FACTORY_TIRES.find((g) => g.id === id);
  if (group) {
    const row = group.rows.find((r) => r.dot === dot) ?? group.rows[0];
    if (!row) return null;
    return {
      id: group.id,
      manufacturer: group.manufacturer,
      model: group.model,
      width: group.width,
      ratio: group.ratio,
      rim: group.rim,
      dot: row.dot,
      factoryPrice: group.factoryPrice,
      spec: FALLBACK_SPEC,
      sellers: [
        {
          code: "T22806",
          discountRate: row.discountRate,
          price: row.price,
          stock: row.stock,
          minOrder: 1,
          shippingNote: "오늘 출고 (오후 3시 30분까지 입금시)",
          courier: "대신택배",
        },
      ],
    };
  }

  return null;
}

function ProductDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem } = useCart();
  const { addOrders } = useOrders();
  const { isWished, toggleWish } = useWishlist();
  const dot = searchParams.get("dot");
  const product = useMemo(() => resolveProduct(params.id, dot), [params.id, dot]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (!product) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-muted mb-4">존재하지 않는 상품입니다.</p>
        <Link href="/products" className="text-brand font-semibold">
          상품 목록으로
        </Link>
      </div>
    );
  }

  function handleAdd(seller: Seller, buyNow: boolean) {
    const qty = quantities[seller.code] || seller.minOrder;
    const item = {
      tireId: product!.id,
      manufacturer: product!.manufacturer,
      model: product!.model,
      width: product!.width,
      ratio: product!.ratio,
      rim: product!.rim,
      dot: product!.dot,
      price: seller.price,
      quantity: qty,
      extraShipping: 0,
      sellerCode: seller.code,
    };

    if (buyNow) {
      addOrders([{ ...item, id: `${item.tireId}-${item.sellerCode}-${Date.now()}` }]);
      router.push("/orders?justOrdered=1");
      return;
    }

    addItem(item);
    router.push("/cart");
  }

  function handleWish(seller: Seller) {
    toggleWish({
      id: `${product!.id}-${seller.code}`,
      type: "타이어판매점",
      code: seller.code,
      location: "판매점 소재지 비공개",
      intro: `${product!.manufacturer} ${product!.model} 취급 판매점`,
    });
  }

  return (
    <div className="px-4 py-5">
      <Link href="/products" className="text-sm text-muted mb-4 inline-flex items-center gap-0.5">
        <ChevronLeft size={16} /> 목록으로
      </Link>

      <h1 className="text-xl font-extrabold mb-1">상품 상세정보</h1>
      <p className="text-xs text-muted mb-4">{product.manufacturer}</p>

      <div className="bg-surface border border-border rounded-xl p-5 mb-5 flex flex-col lg:flex-row gap-4 lg:gap-6">
        <ImagePlaceholder
          className="w-full h-32 lg:w-40 lg:h-40 shrink-0"
          manufacturer={product.manufacturer}
        />
        <div className="flex-1">
          <h2 className="text-lg font-bold mb-1">{product.model}</h2>
          <p className="text-muted mb-4">
            {product.width} / {product.ratio} R {product.rim}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <SpecRow label="생산년도" value={product.dot} />
            <SpecRow label="공장도가" value={`${product.factoryPrice.toLocaleString()}원`} />
            <SpecRow label="하중지수" value={product.spec.loadIndex} />
            <SpecRow label="속도지수" value={product.spec.speedIndex} />
            <SpecRow label="타이어겹수" value={product.spec.ply} />
            <SpecRow label="원산지" value={product.spec.origin} />
            <SpecRow label="기타" value={product.spec.season} />
            <SpecRow label="제품번호" value={product.spec.productCode} />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 mb-5 text-sm leading-relaxed text-muted lg:grid lg:grid-cols-2 lg:gap-8">
        <div>
          <h3 className="text-foreground font-bold mb-2">배송 안내</h3>
          <p>1. 본 상품은 택배 배송 상품입니다. 타이어 특성상 묶음배송이 불가능합니다.</p>
          <p>2. 택배사 사정에 따라 1~3일 추가 기간이 소요될 수 있습니다.</p>
        </div>
        <div>
          <h3 className="text-foreground font-bold mb-2 mt-3 lg:mt-0">반품/교환 안내</h3>
          <p>1. 반품 배송비 : 편도 9,500원 (왕복비용 발생)</p>
          <p>2. 구매자 단순변심은 상품도착 후 7일 이내 (구매자 반품배송비 부담)</p>
        </div>
      </div>

      <h3 className="font-bold mb-3">판매점별 비교</h3>

      <div className="hidden lg:block overflow-x-auto bg-surface border border-border rounded-xl mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-3 px-4 font-medium">판매점</th>
              <th className="py-3 px-4 font-medium">DC율(%)</th>
              <th className="py-3 px-4 font-medium">판매가</th>
              <th className="py-3 px-4 font-medium">재고수량</th>
              <th className="py-3 px-4 font-medium">최소주문수량</th>
              <th className="py-3 px-4 font-medium">출고여부 / 배송</th>
              <th className="py-3 px-4 font-medium">수량</th>
              <th className="py-3 px-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {product.sellers.map((seller) => (
              <tr
                key={seller.code}
                className="border-b border-border last:border-0 hover:bg-background"
              >
                <td className="py-3 px-4 font-semibold">
                  <button
                    onClick={() => handleWish(seller)}
                    aria-label="판매점 찜하기"
                    className={`mr-1.5 align-middle inline-flex active:scale-90 ${isWished(seller.code) ? "text-accent" : "text-border hover:text-accent"}`}
                  >
                    <Star
                      key={String(isWished(seller.code))}
                      size={14}
                      fill={isWished(seller.code) ? "currentColor" : "none"}
                      className="animate-[pop_320ms_ease-out]"
                    />
                  </button>
                  {seller.code}
                </td>
                <td className="py-3 px-4 text-brand font-bold tabular-nums">
                  {seller.discountRate}%
                </td>
                <td className="py-3 px-4 font-bold tabular-nums">
                  {seller.price.toLocaleString()}원
                </td>
                <td className="py-3 px-4">{seller.stock.toLocaleString()}</td>
                <td className="py-3 px-4">{seller.minOrder}</td>
                <td className="py-3 px-4 text-muted text-xs">
                  {seller.shippingNote}
                  <br />
                  {seller.courier}
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    min={seller.minOrder}
                    defaultValue={seller.minOrder}
                    onChange={(e) =>
                      setQuantities((q) => ({ ...q, [seller.code]: Number(e.target.value) }))
                    }
                    className="h-9 w-16 px-2 rounded-lg border border-border text-center"
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAdd(seller, false)}
                      className="h-9 px-3 rounded-lg border border-brand text-brand font-semibold text-xs whitespace-nowrap hover:bg-brand/5 active:scale-95"
                    >
                      장바구니
                    </button>
                    <button
                      onClick={() => handleAdd(seller, true)}
                      className="h-9 px-3 rounded-lg bg-brand text-white font-semibold text-xs whitespace-nowrap hover:bg-brand-dark active:scale-95"
                    >
                      바로구매
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden flex flex-col gap-3">
        {product.sellers.map((seller, i) => (
          <div
            key={seller.code}
            className="bg-surface border border-border rounded-xl p-4 hover:shadow-md animate-[fade-slide-up_400ms_ease-out_both]"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold flex items-center">
                <button
                  onClick={() => handleWish(seller)}
                  aria-label="판매점 찜하기"
                  className={`flex items-center p-2 -m-2 mr-0.5 active:scale-90 ${isWished(seller.code) ? "text-accent" : "text-border hover:text-accent"}`}
                >
                  <Star
                    key={String(isWished(seller.code))}
                    size={18}
                    fill={isWished(seller.code) ? "currentColor" : "none"}
                    className="animate-[pop_320ms_ease-out]"
                  />
                </button>
                {seller.code}
              </span>
              <span className="text-xs text-muted">{seller.courier}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1 tabular-nums">
              <span className="text-brand font-bold">{seller.discountRate}%</span>
              <span className="text-lg font-extrabold">{seller.price.toLocaleString()}원</span>
            </div>
            <p className="text-xs text-muted mb-3">
              재고 {seller.stock.toLocaleString()} · 최소주문수량 {seller.minOrder} ·{" "}
              {seller.shippingNote}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={seller.minOrder}
                defaultValue={seller.minOrder}
                onChange={(e) =>
                  setQuantities((q) => ({ ...q, [seller.code]: Number(e.target.value) }))
                }
                className="h-10 w-20 px-2 rounded-lg border border-border text-center"
              />
              <button
                onClick={() => handleAdd(seller, false)}
                className="flex-1 h-10 rounded-lg border border-brand text-brand font-semibold text-sm hover:bg-brand/5 active:scale-95"
              >
                장바구니 담기
              </button>
              <button
                onClick={() => handleAdd(seller, true)}
                className="flex-1 h-10 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark active:scale-95"
              >
                바로 구매
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="p-10 text-center text-muted">불러오는 중...</div>}>
        <ProductDetailContent />
      </Suspense>
    </RequireAuth>
  );
}
