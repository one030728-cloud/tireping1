"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, Star } from "lucide-react";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import LoadingState from "@/components/LoadingState";
import { CartRequestError, useCart } from "@/lib/cart";
import { OrderRequestError, useOrders } from "@/lib/orders";
import { useWishlist, WishlistRequestError } from "@/lib/wishlist";
import { useAuth } from "@/lib/auth";
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

/*
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
*/

function ProductDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem } = useCart();
  const { addOrders } = useOrders();
  const { isWished, toggleWish } = useWishlist();
  const { user } = useAuth();
  const dot = searchParams.get("dot");
  const [product, setProduct] = useState<ProductView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    const query = dot ? `?dot=${encodeURIComponent(dot)}` : "";
    fetch(`/api/products/${encodeURIComponent(params.id)}${query}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("상품 상세 정보를 불러오지 못했습니다.");
        return response.json() as Promise<{ product: ProductView }>;
      })
      .then((data) => {
        if (!cancelled) {
          setLoadError(false);
          setProduct(data.product);
        }
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
  }, [params.id, dot]);

  const lowestPrice = useMemo(
    () => (product ? Math.min(...product.sellers.map((s) => s.price)) : 0),
    [product],
  );

  if (loading) return <LoadingState />;

  if (!product || loadError) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-muted mb-4">존재하지 않는 상품입니다.</p>
        <Link href="/products" className="text-brand font-semibold">
          상품 목록으로
        </Link>
      </div>
    );
  }

  async function handleAdd(seller: Seller, buyNow: boolean) {
    if (!user || user.role !== "BUYER") {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

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
      stock: seller.stock,
      ...(seller.id ? { listingId: seller.id } : {}),
    };

    try {
      if (buyNow) {
        await addOrders([{ ...item, id: `${item.tireId}-${item.sellerCode}-${Date.now()}` }]);
        router.push("/mypage/orders?justOrdered=1");
      } else {
        await addItem(item);
        router.push("/cart");
      }
    } catch (error) {
      const code =
        error instanceof OrderRequestError || error instanceof CartRequestError
          ? error.code
          : "ORDER_REQUEST_FAILED";
      window.alert(
        code === "ORDER_STOCK_INSUFFICIENT"
          ? "재고가 부족한 상품이 있어 주문할 수 없습니다."
          : "요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  }

  async function handleWish(seller: Seller) {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    try {
      await toggleWish({
        id: `${product!.id}-${seller.code}`,
        type: "타이어판매점",
        code: seller.code,
        location: "판매점 소재지 비공개",
        intro: `${product!.manufacturer} ${product!.model} 취급 판매점`,
      });
    } catch (error) {
      if (error instanceof WishlistRequestError) {
        window.alert("관심 판매처를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }
  }

  return (
    <div className="px-4 py-5">
      <Link href="/products" className="text-sm text-muted mb-4 inline-flex items-center gap-0.5">
        <ChevronLeft size={16} /> 목록으로
      </Link>

      <h1 className="text-xl font-extrabold mb-1">상품 상세정보</h1>
      <p className="text-xs text-muted mb-4">{product.manufacturer}</p>

      <div className="card p-5 mb-5 flex flex-col md:flex-row gap-4 md:gap-6">
        {product.sellers.find((seller) => seller.images?.[0])?.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- seller image URLs come from configured object storage
          <img
            src={product.sellers.find((seller) => seller.images?.[0])?.images?.[0]}
            alt={`${product.manufacturer} ${product.model}`}
            className="h-40 w-40 rounded-lg object-contain mx-auto md:mx-0 shrink-0"
          />
        ) : (
          <ImagePlaceholder
            className="w-40 h-40 mx-auto md:mx-0 shrink-0"
            manufacturer={product.manufacturer}
          />
        )}
        <div className="flex-1">
          <h2 className="text-lg font-bold mb-1">{product.model}</h2>
          <p className="text-muted mb-4">
            {product.width} / {product.ratio} R {product.rim}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <SpecRow label="생산년도" value={product.dot} />
            <SpecRow
              label="공장도가"
              value={user ? `${product.factoryPrice.toLocaleString()}원` : "로그인 후 공개"}
            />
            <SpecRow label="하중지수" value={product.spec.loadIndex} />
            <SpecRow label="속도지수" value={product.spec.speedIndex} />
            <SpecRow label="타이어겹수" value={product.spec.ply} />
            <SpecRow label="원산지" value={product.spec.origin} />
            <SpecRow label="기타" value={product.spec.season} />
            <SpecRow label="제품번호" value={product.spec.productCode} />
          </div>
        </div>
      </div>

      <div className="card p-5 mb-5 text-sm leading-relaxed text-muted md:grid md:grid-cols-2 md:gap-8">
        <div>
          <h3 className="text-foreground font-bold mb-2">배송 안내</h3>
          <p>1. 본 상품은 택배 배송 상품입니다. 타이어 특성상 묶음배송이 불가능합니다.</p>
          <p>2. 택배사 사정에 따라 1~3일 추가 기간이 소요될 수 있습니다.</p>
        </div>
        <div>
          <h3 className="text-foreground font-bold mb-2 mt-3 md:mt-0">반품/교환 안내</h3>
          <p>
            1. 반품 배송비 : {user ? "편도 9,500원 (왕복비용 발생)" : "로그인 후 공개"}
          </p>
          <p>2. 구매자 단순변심은 상품도착 후 7일 이내 (구매자 반품배송비 부담)</p>
        </div>
      </div>

      <h3 className="font-bold mb-3">판매점별 비교</h3>

      <div className="hidden lg:block overflow-x-auto card mb-8">
        <table className="min-w-[880px] w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-3 px-4 font-medium">판매점</th>
              <th className="py-3 px-4 font-medium">DC율(%)</th>
              <th className="py-3 px-4 font-medium">판매가</th>
              <th className="py-3 px-4 font-medium">재고수량</th>
              <th className="py-3 px-4 font-medium">최소주문수량</th>
              <th className="py-3 px-4 font-medium whitespace-nowrap">출고여부 / 배송</th>
              <th className="py-3 px-4 font-medium">수량</th>
              <th className="py-3 px-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {product.sellers.map((seller) => (
              <tr
                key={seller.code}
                className="border-b border-border last:border-0 hover:bg-surface-2"
              >
                <td className="py-3 px-4 font-semibold">
                  {user && (
                    <button
                      onClick={() => void handleWish(seller)}
                      aria-label="판매점 찜하기"
                      className={`mr-1.5 align-middle inline-flex active:scale-90 ${isWished(seller.code) ? "text-accent" : "text-muted hover:text-accent"}`}
                    >
                      <Star
                        key={String(isWished(seller.code))}
                        size={14}
                        fill={isWished(seller.code) ? "currentColor" : "none"}
                        className="animate-[pop_320ms_ease-out]"
                      />
                    </button>
                  )}
                  {seller.code}
                  {seller.price === lowestPrice && (
                    <span className="ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent align-middle">
                      최저가
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-brand font-bold tabular-nums">
                  {seller.discountRate}%
                </td>
                <td className="py-3 px-4 font-bold tabular-nums">
                  {user ? `${seller.price.toLocaleString()}원` : "로그인 후 공개"}
                </td>
                <td className="py-3 px-4">
                  {user ? seller.stock.toLocaleString() : "로그인 후 공개"}
                </td>
                <td className="py-3 px-4">{user ? seller.minOrder : "로그인 후 공개"}</td>
                <td className="py-3 px-4 text-muted text-xs">
                  {seller.shippingNote}
                  <br />
                  {seller.courier}
                </td>
                <td className="py-3 px-4">
                  {user ? (
                    <input
                      type="number"
                      min={seller.minOrder}
                      max={seller.stock}
                      defaultValue={seller.minOrder}
                      aria-label="주문 수량"
                      onChange={(e) =>
                        setQuantities((q) => ({ ...q, [seller.code]: Number(e.target.value) }))
                      }
                      className="h-9 w-16 px-2 rounded-lg border border-border text-center focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {user ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleAdd(seller, false)}
                        className="btn-outline h-9 px-3 text-xs whitespace-nowrap"
                      >
                        장바구니
                      </button>
                      <button
                        onClick={() => void handleAdd(seller, true)}
                        className="btn-primary h-9 px-3 text-xs whitespace-nowrap"
                      >
                        바로구매
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/products/${product.id}${dot ? `?dot=${dot}` : ""}`)}`}
                      className="btn-primary h-9 px-3 text-xs whitespace-nowrap"
                    >
                      로그인 후 구매
                    </Link>
                  )}
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
            className="card p-4 animate-[fade-slide-up_400ms_ease-out_both]"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold flex items-center">
                {user && (
                  <button
                    onClick={() => void handleWish(seller)}
                    aria-label="판매점 찜하기"
                    className={`flex items-center p-2 -m-2 mr-0.5 active:scale-90 ${isWished(seller.code) ? "text-accent" : "text-muted hover:text-accent"}`}
                  >
                    <Star
                      key={String(isWished(seller.code))}
                      size={18}
                      fill={isWished(seller.code) ? "currentColor" : "none"}
                      className="animate-[pop_320ms_ease-out]"
                    />
                  </button>
                )}
                {seller.code}
                {seller.price === lowestPrice && (
                  <span className="ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                    최저가
                  </span>
                )}
              </span>
              <span className="text-xs text-muted">{seller.courier}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1 tabular-nums">
              <span className="text-brand font-bold">{seller.discountRate}%</span>
              <span className="text-lg font-extrabold">
                {user ? `${seller.price.toLocaleString()}원` : "로그인 후 가격 확인"}
              </span>
            </div>
            <p className="text-xs text-muted mb-3">
              {user
                ? `재고 ${seller.stock.toLocaleString()} · 최소주문수량 ${seller.minOrder} · ${seller.shippingNote}`
                : `재고·최소주문수량 로그인 후 공개 · ${seller.shippingNote}`}
            </p>
            {user ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={seller.minOrder}
                  max={seller.stock}
                  defaultValue={seller.minOrder}
                  aria-label="주문 수량"
                  onChange={(e) =>
                    setQuantities((q) => ({ ...q, [seller.code]: Number(e.target.value) }))
                  }
                  className="h-10 w-20 px-2 rounded-lg border border-border text-center focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                />
                <button
                  onClick={() => void handleAdd(seller, false)}
                  className="btn-outline flex-1 h-10 text-sm"
                >
                  장바구니 담기
                </button>
                <button
                  onClick={() => void handleAdd(seller, true)}
                  className="btn-primary flex-1 h-10 text-sm"
                >
                  바로 구매
                </button>
              </div>
            ) : (
              <Link
                href={`/login?redirect=${encodeURIComponent(`/products/${product.id}${dot ? `?dot=${dot}` : ""}`)}`}
                className="btn-primary h-11 w-full text-sm"
              >
                로그인 후 가격 확인·구매
              </Link>
            )}
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
    <Suspense fallback={<LoadingState />}>
      <ProductDetailContent />
    </Suspense>
  );
}
