"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CANCEL_STATUS, ORDER_STATUS } from "./order-status";
import type { CancelStatusCounts, CartItem, FullOrder, Manufacturer, OrderStatusCounts } from "./types";
import { useAuth } from "./auth";

const ORDER_STATUS_KEYS = [
  ORDER_STATUS.PAYMENT_PENDING,
  ORDER_STATUS.PAYMENT_COMPLETED,
  ORDER_STATUS.ORDER_CONFIRMED,
  ORDER_STATUS.SHIPPING_PREPARING,
  ORDER_STATUS.SHIPPING,
  ORDER_STATUS.SHIPPING_COMPLETED,
  ORDER_STATUS.PURCHASE_CONFIRMED,
] satisfies (keyof OrderStatusCounts)[];

const CANCEL_STATUS_KEYS = [
  CANCEL_STATUS.PAYMENT_AFTER,
  CANCEL_STATUS.PAYMENT_BEFORE,
  CANCEL_STATUS.EXCHANGE_COMPLETED,
  CANCEL_STATUS.RETURN_COMPLETED,
  CANCEL_STATUS.OUT_OF_STOCK,
  CANCEL_STATUS.NOT_DELIVERED,
] satisfies (keyof CancelStatusCounts)[];

interface OrdersContextValue {
  orders: FullOrder[];
  loading: boolean;
  addOrders: (items: CartItem[]) => Promise<FullOrder[]>;
  cancelOrder: (id: string, reason?: string) => Promise<FullOrder>;
  refreshOrders: () => Promise<FullOrder[]>;
  orderStatusCounts: OrderStatusCounts;
  cancelStatusCounts: CancelStatusCounts;
}

interface BuyerOrderApi {
  id: string;
  listingId: string;
  sellerId: string;
  status: string;
  cancelReason: string | null;
  shippingStatus: string;
  shippingStatusLabel: string;
  courier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  manufacturer: string;
  model: string;
  width: number;
  ratio: number;
  rim: number;
  dot: string;
  factoryPrice: number;
  unitPrice: number;
  quantity: number;
  extraShipping: number;
  total: number;
  sellerCode: string;
  orderedAt: string;
}

export class OrderRequestError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "OrderRequestError";
  }
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

function toFullOrder(order: BuyerOrderApi): FullOrder {
  return {
    id: order.id,
    listingId: order.listingId,
    sellerId: order.sellerId,
    status: order.status,
    manufacturer: order.manufacturer as Manufacturer,
    model: order.model,
    width: order.width,
    ratio: order.ratio,
    rim: order.rim,
    dot: order.dot,
    factoryPrice: order.factoryPrice,
    unitPrice: order.unitPrice,
    quantity: order.quantity,
    extraShipping: order.extraShipping,
    total: order.total,
    sellerCode: order.sellerCode,
    orderedAt: order.orderedAt,
    cancelReason: order.cancelReason,
    shippingStatus: order.shippingStatus,
    shippingStatusLabel: order.shippingStatusLabel,
    courier: order.courier,
    trackingNumber: order.trackingNumber,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
  };
}

async function readOrderResponse(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { orders?: BuyerOrderApi[]; order?: BuyerOrderApi; error?: string }
    | null;
  if (!response.ok) throw new OrderRequestError(body?.error ?? "ORDER_REQUEST_FAILED");
  return body;
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const [orders, setOrders] = useState<FullOrder[]>([]);
  const [ordersOwnerId, setOrdersOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshOrders = useCallback(async () => {
    const response = await fetch("/api/orders", { cache: "no-store" });
    const body = await readOrderResponse(response);
    const nextOrders = (body?.orders ?? []).map(toFullOrder);
    setOrders(nextOrders);
    setOrdersOwnerId(userId ?? null);
    return nextOrders;
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!userId || userRole !== "BUYER") {
      return () => {
        cancelled = true;
      };
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize the session with the external orders API
    void refreshOrders()
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, refreshOrders, userId, userRole]);

  const addOrders = useCallback(async (items: CartItem[]) => {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const body = await readOrderResponse(response);
    const createdOrders = (body?.orders ?? []).map(toFullOrder);
    setOrdersOwnerId(userId ?? null);
    setOrders((current) => [
      ...createdOrders,
      ...current.filter((order) => !createdOrders.some((created) => created.id === order.id)),
    ]);
    return createdOrders;
  }, [userId]);

  const cancelOrder = useCallback(async (id: string, reason?: string) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason ?? "" }),
    });
    const body = await readOrderResponse(response);
    if (!body?.order) throw new OrderRequestError("ORDER_RESPONSE_INVALID");
    const cancelledOrder = toFullOrder(body.order);
    setOrders((current) =>
      current.map((order) => (order.id === cancelledOrder.id ? cancelledOrder : order)),
    );
    return cancelledOrder;
  }, []);

  const visibleOrders = ordersOwnerId === userId && userRole === "BUYER" ? orders : [];
  const visibleOrderStatusCounts = ORDER_STATUS_KEYS.reduce((acc, key) => {
    acc[key] = visibleOrders.filter((order) => order.status === key).length;
    return acc;
  }, {} as OrderStatusCounts);
  const visibleCancelStatusCounts = CANCEL_STATUS_KEYS.reduce((acc, key) => {
    acc[key] = visibleOrders.filter((order) => order.status === key).length;
    return acc;
  }, {} as CancelStatusCounts);

  return (
    <OrdersContext.Provider
      value={{
        orders: visibleOrders,
        loading: authLoading ||
          (userRole === "BUYER" ? loading || ordersOwnerId !== userId : false),
        addOrders,
        cancelOrder,
        refreshOrders,
        orderStatusCounts: visibleOrderStatusCounts,
        cancelStatusCounts: visibleCancelStatusCounts,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
