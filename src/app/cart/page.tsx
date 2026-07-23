"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
        <div className="text-center py-16">
          <p className="text-muted mb-4">장바구니에 담은 상품이 없습니다.</p>
          <Link href="/products" className="text-brand font-semibold">
            타이어 검색하러 가기
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto bg-surface border border-border rounded-xl">
            <table className="w-full text-sm border-collapse">
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
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4">{item.manufacturer}</td>
                    <td className="py-3 px-4 font-medium">{item.model}</td>
                    <td className="py-3 px-4">
                      {item.width}/{item.ratio}R{item.rim}
                    </td>
                    <td className="py-3 px-4">{item.dot}</td>
                    <td className="py-3 px-4">{item.price.toLocaleString()}원</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded border border-border"
                        >
                          -
                        </button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded border border-border"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {(item.price * item.quantity).toLocaleString()}원
                    </td>
                    <td className="py-3 px-4">{item.sellerCode}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-muted hover:text-accent"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} className="bg-surface border border-border rounded-xl p-4">
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
                    className="text-xs text-muted hover:text-accent shrink-0"
                  >
                    삭제
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg border border-border"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg border border-border"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold">
                    {(item.price * item.quantity).toLocaleString()}원
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 mt-5 flex items-center justify-between">
            <span className="font-semibold">합계금액</span>
            <span className="text-xl font-extrabold text-brand">{total.toLocaleString()}원</span>
          </div>

          <div className="flex gap-2 mt-4 pb-8">
            <button
              onClick={clear}
              className="h-12 px-5 rounded-lg border border-border text-sm font-semibold"
            >
              전체삭제
            </button>
            <button
              onClick={() => {
                addOrders(items);
                clear();
                router.push("/orders?justOrdered=1");
              }}
              className="flex-1 h-12 rounded-lg bg-brand text-white font-semibold"
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
