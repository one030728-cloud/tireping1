"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { useCart } from "@/lib/cart";
import { useOrders } from "@/lib/orders";

function CartContent() {
  const { items, removeItem, updateQuantity, clear } = useCart();
  const { addOrders } = useOrders();
  const router = useRouter();

  const total = items.reduce((sum, i) => sum + i.price * i.quantity + i.extraShipping, 0);

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-1">타이어 장바구니</h1>
      <p className="text-sm text-muted mb-5">
        장바구니에 담긴 상품은 주문이 없을 경우 1시간 후에 자동 삭제됩니다.
      </p>

      {items.length === 0 ? (
        <div className="card text-center py-16 animate-[fade-slide-up_400ms_ease-out_both]">
          <ShoppingCart size={32} className="mx-auto mb-3 text-border" strokeWidth={1.5} />
          <p className="text-muted mb-4">장바구니에 담은 상품이 없습니다.</p>
          <Link href="/products" className="text-brand font-semibold">
            타이어 검색하러 가기
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto card">
            <table className="min-w-[880px] w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-3 px-4 font-medium">제조사</th>
                  <th className="py-3 px-4 font-medium">주문상품</th>
                  <th className="py-3 px-4 font-medium">사이즈</th>
                  <th className="py-3 px-4 font-medium">생산년도</th>
                  <th className="py-3 px-4 font-medium">판매가</th>
                  <th className="py-3 px-4 font-medium">수량</th>
                  <th className="py-3 px-4 font-medium">합계금액</th>
                  <th className="py-3 px-4 font-medium">판매점</th>
                  <th className="py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border last:border-0 hover:bg-surface-2"
                  >
                    <td className="py-3 px-4">{item.manufacturer}</td>
                    <td className="py-3 px-4 font-medium">{item.model}</td>
                    <td className="py-3 px-4">
                      {item.width}/{item.ratio}R{item.rim}
                    </td>
                    <td className="py-3 px-4">{item.dot}</td>
                    <td className="py-3 px-4 tabular-nums">{item.price.toLocaleString()}원</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="수량 감소"
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-surface-2 active:scale-90"
                        >
                          <Minus size={13} />
                        </button>
                        <span
                          key={item.quantity}
                          className="w-6 text-center tabular-nums animate-[pop_250ms_ease-out]"
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="수량 증가"
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-surface-2 active:scale-90"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold tabular-nums">
                      {(item.price * item.quantity).toLocaleString()}원
                    </td>
                    <td className="py-3 px-4">{item.sellerCode}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent"
                      >
                        <Trash2 size={13} /> 삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden flex flex-col gap-3">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="card p-4 animate-[fade-slide-up_400ms_ease-out_both]"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-muted mb-0.5">
                      {item.manufacturer} · {item.sellerCode}
                    </p>
                    <p className="font-semibold">{item.model}</p>
                    <p className="text-xs text-muted mt-1">
                      {item.width} / {item.ratio} R {item.rim} · DOT {item.dot}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent shrink-0"
                  >
                    <Trash2 size={13} /> 삭제
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="수량 감소"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-surface-2 active:scale-90"
                    >
                      <Minus size={14} />
                    </button>
                    <span
                      key={item.quantity}
                      className="w-8 text-center tabular-nums animate-[pop_250ms_ease-out]"
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="수량 증가"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-surface-2 active:scale-90"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold tabular-nums">
                    {(item.price * item.quantity).toLocaleString()}원
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-4 mt-5 flex items-center justify-between">
            <span className="font-semibold">합계금액</span>
            <span
              key={total}
              className="text-xl font-extrabold text-brand tabular-nums animate-[pop_280ms_ease-out]"
            >
              {total.toLocaleString()}원
            </span>
          </div>

          <div className="flex gap-2 mt-4 pb-8">
            <button
              onClick={clear}
              className="h-12 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-surface-2 active:scale-95 transition-all"
            >
              전체삭제
            </button>
            <button
              onClick={() => {
                addOrders(items);
                clear();
                router.push("/orders?justOrdered=1");
              }}
              className="btn-primary flex-1 h-12"
            >
              주문하기
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <RequireAuth>
      <CartContent />
    </RequireAuth>
  );
}
