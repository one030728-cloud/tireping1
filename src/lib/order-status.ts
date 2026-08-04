import type { ShippingStatus } from "@prisma/client";

export const ORDER_STATUS = {
  PAYMENT_PENDING: "입금대기",
  PAYMENT_COMPLETED: "입금완료",
  ORDER_CONFIRMED: "주문확인",
  SHIPPING_PREPARING: "배송준비중",
  SHIPPING: "배송중",
  SHIPPING_COMPLETED: "배송완료",
  PURCHASE_CONFIRMED: "구매확정",
} as const;

export const CANCEL_STATUS = {
  PAYMENT_AFTER: "입금후취소",
  PAYMENT_BEFORE: "입금전취소",
  EXCHANGE_COMPLETED: "교환완료",
  RETURN_COMPLETED: "반품완료",
  OUT_OF_STOCK: "재고없음",
  NOT_DELIVERED: "상품미도착",
} as const;

export const SHIPPING_STATUS_LABEL: Record<ShippingStatus, string> = {
  PREPARING: "배송준비중",
  TRACKING_REGISTERED: "송장번호입력",
  SHIPPED: "발송완료",
  DELIVERED: "배송완료",
};

export function isCancelledOrderStatus(status: string) {
  return Object.values(CANCEL_STATUS).includes(status as (typeof CANCEL_STATUS)[keyof typeof CANCEL_STATUS]);
}
