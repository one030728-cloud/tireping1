"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CancelStatusCounts, CartItem, FullOrder, OrderStatusCounts } from "./types";
import { FULL_ORDERS } from "./mockData";

const STORAGE_KEY = "tirezone_orders";

const ORDER_STATUS_KEYS = Object.keys({
  입금대기: 0,
  입금완료: 0,
  주문확인: 0,
  배송준비중: 0,
  배송중: 0,
  배송완료: 0,
  구매확정: 0,
} satisfies OrderStatusCounts) as (keyof OrderStatusCounts)[];

const CANCEL_STATUS_KEYS = Object.keys({
  입금전취소: 0,
  입금후취소: 0,
  교환완료: 0,
  반품완료: 0,
  재고없음: 0,
  상품미도착: 0,
} satisfies CancelStatusCounts) as (keyof CancelStatusCounts)[];

interface OrdersContextValue {
  orders: FullOrder[];
  addOrders: (items: CartItem[]) => FullOrder[];
  orderStatusCounts: OrderStatusCounts;
  cancelStatusCounts: CancelStatusCounts;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

function estimateFactoryPrice(price: number) {
  return Math.round(price / 0.55 / 100) * 100;
}

function formatOrderedAt(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<FullOrder[]>(FULL_ORDERS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration after mount, required to avoid SSR/client markup mismatch
        setOrders(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }
  }, [orders, hydrated]);

  const addOrders: OrdersContextValue["addOrders"] = (items) => {
    const now = new Date();
    const newOrders: FullOrder[] = items.map((item, i) => ({
      id: String(Date.now() + i),
      status: "입금대기",
      manufacturer: item.manufacturer,
      model: item.model,
      width: item.width,
      ratio: item.ratio,
      rim: item.rim,
      factoryPrice: estimateFactoryPrice(item.price),
      unitPrice: item.price,
      quantity: item.quantity,
      extraShipping: item.extraShipping,
      total: item.price * item.quantity + item.extraShipping,
      sellerCode: item.sellerCode,
      orderedAt: formatOrderedAt(now),
    }));
    setOrders((prev) => [...newOrders, ...prev]);
    return newOrders;
  };

  const orderStatusCounts = ORDER_STATUS_KEYS.reduce((acc, key) => {
    acc[key] = orders.filter((o) => o.status === key).length;
    return acc;
  }, {} as OrderStatusCounts);

  const cancelStatusCounts = CANCEL_STATUS_KEYS.reduce((acc, key) => {
    acc[key] = orders.filter((o) => o.status === key).length;
    return acc;
  }, {} as CancelStatusCounts);

  return (
    <OrdersContext.Provider value={{ orders, addOrders, orderStatusCounts, cancelStatusCounts }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
