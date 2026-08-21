import { Prisma, type ShippingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { CartItem } from "@/lib/types";
import {
  CANCEL_STATUS,
  isCancelledOrderStatus,
  ORDER_STATUS,
  orderStatusRank,
  SHIPPING_STATUS_LABEL,
  type OrderStatusValue,
} from "@/lib/order-status";
import { prisma } from "./prisma";

const orderItemSchema = z.object({
  id: z.string().trim().min(1).max(200),
  tireId: z.string().trim().min(1).max(200),
  manufacturer: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(160),
  width: z.coerce.number().int().min(1).max(999),
  ratio: z.coerce.number().int().min(1).max(999),
  rim: z.coerce.number().int().min(1).max(99),
  dot: z.string().trim().min(1).max(20),
  price: z.coerce.number().int().min(0).max(100_000_000),
  quantity: z.coerce.number().int().min(1).max(100_000),
  extraShipping: z.coerce.number().int().min(0).max(1_000_000),
  sellerCode: z.string().trim().min(1).max(40),
  stock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  listingId: z.string().trim().min(1).max(200).optional(),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(100),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const buyerOrderInclude = {
  listing: {
    include: {
      product: true,
      seller: { select: { code: true } },
    },
  },
} satisfies Prisma.OrderInclude;

type BuyerOrderRecord = Prisma.OrderGetPayload<{
  include: typeof buyerOrderInclude;
}>;

export class OrderDomainError extends Error {
  constructor(
    public readonly code:
      | "ORDER_ITEM_NOT_FOUND"
      | "ORDER_QUANTITY_TOO_SMALL"
      | "ORDER_STOCK_INSUFFICIENT"
      | "ORDER_ALREADY_CANCELLED"
      | "ORDER_NOT_FOUND"
      | "CANCEL_AFTER_SHIPPING"
      | "CANCEL_REASON_REQUIRED"
      | "PURCHASE_CONFIRM_INVALID_STATUS",
    public readonly status = 409,
  ) {
    super(code);
    this.name = "OrderDomainError";
  }
}

export function validationResponse(error: unknown) {
  if (!(error instanceof z.ZodError)) return null;
  return NextResponse.json(
    { error: "VALIDATION_ERROR", details: error.issues },
    { status: 400 },
  );
}

export function serverErrorResponse(error: unknown, message: string) {
  console.error(message, error);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "DUPLICATE_RESOURCE" }, { status: 409 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export function domainErrorResponse(error: unknown) {
  if (!(error instanceof OrderDomainError)) return null;
  return NextResponse.json({ error: error.code }, { status: error.status });
}

function toBuyerOrderView(order: BuyerOrderRecord) {
  return {
    id: order.id,
    listingId: order.listingId,
    sellerId: order.sellerId,
    status: order.status,
    cancelReason: order.cancelReason,
    shippingStatus: order.shippingStatus,
    shippingStatusLabel: SHIPPING_STATUS_LABEL[order.shippingStatus],
    courier: order.courier,
    trackingNumber: order.trackingNumber,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    manufacturer: order.listing.product.manufacturer,
    model: order.listing.product.model,
    width: order.listing.product.width,
    ratio: order.listing.product.ratio,
    rim: order.listing.product.rim,
    dot: order.listing.dot,
    factoryPrice: order.listing.factoryPrice,
    unitPrice: order.unitPrice,
    quantity: order.quantity,
    extraShipping: order.extraShipping,
    total: order.unitPrice * order.quantity + order.extraShipping,
    sellerCode: order.listing.seller.code,
    orderedAt: order.orderedAt.toISOString(),
  };
}

export type BuyerOrderView = ReturnType<typeof toBuyerOrderView>;

// Same lazy-expiry idea as CART_ITEM_TTL_MS in src/lib/server/cart.ts: this
// Render deployment is a plain web service with no cron/worker, so an unpaid
// (입금대기) order can't be expired by a background job. Instead every read
// path that lists orders (buyer/seller/admin) prunes stale 입금대기 rows in
// its own scope first. Without this, an approved buyer (or anyone abandoning
// checkout) can call POST /api/orders repeatedly and permanently hold
// Listing.stock hostage, since nothing else ever gives it back.
//
// The deadline is tracked per-order (Order.paymentDeadline) rather than as a
// flat "orderedAt + TTL" computed here, because /api/payments/toss/prepare
// can run well after order creation and must be able to extend the deadline
// for the specific orders it prepares — see prepare/route.ts.
export const UNPAID_ORDER_TTL_MS = 30 * 60 * 1000;

// Expires every 입금대기 order matching `scope` whose paymentDeadline has
// passed: flips it to 입금전취소, restores the listing's stock, and reopens
// the listing if that stock restoration takes it off SOLDOUT. Callers scope
// this to the relevant user/seller (buyer/seller order lists) so one user's
// read never touches another user's rows; getAdminOrders passes an empty
// scope ({}) since the admin order list is intentionally global.
export async function expireStaleUnpaidOrders(scope: Prisma.OrderWhereInput) {
  const candidates = await prisma.order.findMany({
    where: {
      ...scope,
      status: ORDER_STATUS.PAYMENT_PENDING,
      paymentDeadline: { lt: new Date() },
    },
    select: { id: true },
  });

  for (const { id } of candidates) {
    // One transaction per order: each expiry only ever touches that order's
    // own row and its own listing, so nothing is gained by batching several
    // orders into one transaction, and keeping them separate means one
    // order's expiry being skipped never rolls back the others.
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { listing: true },
      });
      // Already moved off 입금대기 (paid, cancelled, or expired by a
      // concurrent call) between the findMany above and this transaction —
      // nothing to do.
      if (!order || order.status !== ORDER_STATUS.PAYMENT_PENDING) return;

      // Conditional updateMany guarded on the current status is what keeps
      // this safe against a concurrent Toss confirm: confirm only ever flips
      // PAYMENT_PENDING -> PAYMENT_COMPLETED inside its own transaction and
      // re-reads order state there (see toss/confirm/route.ts), so whichever
      // of the two writes commits first wins and the other's updateMany
      // simply matches 0 rows instead of clobbering the winner.
      const expired = await tx.order.updateMany({
        where: { id, status: ORDER_STATUS.PAYMENT_PENDING },
        data: {
          status: CANCEL_STATUS.PAYMENT_BEFORE,
          cancelReason: "결제 시간 초과로 자동 취소되었습니다.",
        },
      });
      if (expired.count !== 1) return;

      // Mirrors the stock-restore/SOLDOUT-reopen in cancelOrder (~line 357).
      await tx.listing.update({
        where: { id: order.listingId },
        data: {
          stock: { increment: order.quantity },
          ...(order.listing.status === "SOLDOUT" ? { status: "ACTIVE" } : {}),
        },
      });
    });
  }
}

export async function getBuyerOrders(buyerId: string) {
  await expireStaleUnpaidOrders({ buyerId });

  const orders = await prisma.order.findMany({
    where: { buyerId },
    orderBy: { orderedAt: "desc" },
    include: buyerOrderInclude,
  });
  return orders.map(toBuyerOrderView);
}

type OrderItemInput = z.infer<typeof orderItemSchema>;

// Only listings from a seller in good standing may be ordered — a suspended
// or withdrawn seller can no longer log in to ship, so their listings must be
// excluded here even if a client bypasses the public catalog and posts an
// order request directly.
const sellerInGoodStanding = {
  status: "ACTIVE" as const,
  user: { withdrawnAt: null },
};

async function findActiveListing(tx: Prisma.TransactionClient, item: OrderItemInput) {
  const commonWhere = {
    seller: { code: item.sellerCode, ...sellerInGoodStanding },
    dot: item.dot,
    status: "ACTIVE" as const,
  };

  // The cart/product page now carries the exact listing the buyer priced and
  // clicked on. Prefer it and re-validate ownership/status/seller-code here
  // rather than trusting the client — this is what makes checkout match the
  // listing (and price) actually shown on screen instead of falling through
  // to an unordered findFirst over every listing that happens to share the
  // same product + DOT.
  if (item.listingId) {
    const byListingId = await tx.listing.findFirst({
      where: { ...commonWhere, id: item.listingId },
      include: { product: true },
    });
    if (byListingId) return byListingId;
  }

  // Deterministic fallback for older clients that don't send listingId yet:
  // order by price then id so a seller with several ACTIVE listings for the
  // same product/DOT always resolves to the same (cheapest) one instead of
  // whichever row the database happens to return first.
  const byProductId = await tx.listing.findFirst({
    where: { ...commonWhere, productId: item.tireId },
    orderBy: [{ price: "asc" }, { id: "asc" }],
    include: { product: true },
  });
  if (byProductId) return byProductId;

  return tx.listing.findFirst({
    where: {
      ...commonWhere,
      product: {
        manufacturer: item.manufacturer,
        model: item.model,
        width: item.width,
        ratio: item.ratio,
        rim: item.rim,
      },
    },
    orderBy: [{ price: "asc" }, { id: "asc" }],
    include: { product: true },
  });
}

export async function createBuyerOrders(buyerId: string, data: z.infer<typeof createOrderSchema>) {
  // Expire this buyer's own stale 입금대기 orders first, so their stock is
  // back in the pool before we check availability for the new order below —
  // otherwise a buyer who repeatedly abandons checkout would see listings as
  // sold out that are only "sold out" because their own expired orders never
  // released the stock.
  await expireStaleUnpaidOrders({ buyerId });

  const createdIds = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];

    for (const item of data.items) {
      const listing = await findActiveListing(tx, item);
      if (!listing) throw new OrderDomainError("ORDER_ITEM_NOT_FOUND", 404);
      if (item.quantity < listing.minOrder) {
        throw new OrderDomainError("ORDER_QUANTITY_TOO_SMALL");
      }

      const updated = await tx.listing.updateMany({
        where: {
          id: listing.id,
          status: "ACTIVE",
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) {
        throw new OrderDomainError("ORDER_STOCK_INSUFFICIENT");
      }

      const remainingListing = await tx.listing.findUnique({
        where: { id: listing.id },
        select: { stock: true },
      });
      if (remainingListing?.stock === 0) {
        await tx.listing.update({
          where: { id: listing.id },
          data: { status: "SOLDOUT" },
        });
      }

      const order = await tx.order.create({
        data: {
          buyerId,
          listingId: listing.id,
          sellerId: listing.sellerId,
          quantity: item.quantity,
          unitPrice: listing.price,
          extraShipping: item.extraShipping,
          status: ORDER_STATUS.PAYMENT_PENDING,
          shippingStatus: "PREPARING",
          courier: null,
          trackingNumber: null,
          paymentDeadline: new Date(Date.now() + UNPAID_ORDER_TTL_MS),
        },
      });
      ids.push(order.id);
    }

    return ids;
  });

  const orders = await prisma.order.findMany({
    where: { id: { in: createdIds } },
    include: buyerOrderInclude,
    orderBy: { orderedAt: "desc" },
  });
  return orders.map(toBuyerOrderView);
}

type CancelActor =
  | { kind: "BUYER"; userId: string }
  | { kind: "SELLER"; sellerId: string }
  | { kind: "ADMIN"; userId: string };

const cancelledStatusValues = Object.values(CANCEL_STATUS);

async function cancelTossPaymentForRefund(
  paymentKey: string | null,
  reason: string,
  idempotencyKey: string,
): Promise<boolean> {
  if (!paymentKey) return false;
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    console.error("TOSS_PAYMENT_CANCEL_SECRET_KEY_MISSING", { paymentKey });
    return false;
  }
  const authorization = Buffer.from(`${secretKey}:`).toString("base64");
  try {
    const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
        // Toss dedupes cancel requests by this header, so a retried call
        // after a network timeout (where we can't tell if the first call
        // actually landed) can't double-refund the same cancellation.
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ cancelReason: reason }),
    });
    return response.ok;
  } catch (error) {
    console.error("TOSS_PAYMENT_CANCEL_REQUEST_FAILED", { paymentKey, error });
    return false;
  }
}

// Runs after the DB transaction that recorded refundRequiredAt has already
// committed — an external HTTP call must never happen inside a Prisma
// transaction (see cancelOrder). The refundRequiredAt/refundReason/
// refundAmount written by that transaction are the durable record of "a
// refund is owed"; this call is best-effort on top of it; if it fails (or
// the process dies before it runs), that record is still sitting in the DB
// for an admin to act on rather than being lost.
async function settleFullRefundViaToss(paymentId: string, paymentKey: string | null, orderId: string) {
  try {
    const tossCancelSucceeded = await cancelTossPaymentForRefund(
      paymentKey,
      "ALL_ORDERS_ON_PAYMENT_CANCELLED",
      `order-cancel-refund:${orderId}`,
    );
    await prisma.payment.updateMany({
      where: { id: paymentId, status: "DONE" },
      data: tossCancelSucceeded
        ? { status: "CANCELED", refundRequiredAt: null, refundReason: "FULLY_REFUNDED_VIA_TOSS_CANCEL" }
        : { refundReason: "ALL_ORDERS_CANCELLED_AUTO_REFUND_FAILED" },
    });
  } catch (error) {
    console.error("TOSS_PAYMENT_CANCEL_SETTLEMENT_FAILED", { paymentId, paymentKey, orderId, error });
  }
}

export async function cancelOrder(
  orderId: string,
  actor: CancelActor,
  reason?: string,
) {
  if (actor.kind === "SELLER" && !reason?.trim()) {
    throw new OrderDomainError("CANCEL_REASON_REQUIRED", 400);
  }

  const { order: updated, fullRefundCandidate } = await prisma.$transaction(async (tx) => {
    let fullRefundCandidate: { paymentId: string; paymentKey: string | null } | null = null;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { listing: true },
    });
    if (!order) throw new OrderDomainError("ORDER_NOT_FOUND", 404);

    const belongsToActor =
      (actor.kind === "BUYER" && order.buyerId === actor.userId) ||
      (actor.kind === "SELLER" && order.sellerId === actor.sellerId) ||
      actor.kind === "ADMIN";
    if (!belongsToActor) throw new OrderDomainError("ORDER_NOT_FOUND", 404);
    if (isCancelledOrderStatus(order.status)) {
      throw new OrderDomainError("ORDER_ALREADY_CANCELLED");
    }
    // Both axes have to be checked, because each one catches a case the other
    // misses:
    //  - order.status (rank) is the axis that can never regress once
    //    advanced, whereas an admin may reset shippingStatus to an earlier
    //    value without limit (see updateAdminShipping). Gating on status
    //    alone stops an admin correcting a shippingStatus mistake from
    //    accidentally reopening cancellation on an order that truly shipped,
    //    and blocks cancellation at 구매확정 for free (rank 6 > 배송중's 4).
    //  - shippingStatus still has to be checked because order.status was NOT
    //    kept in lock-step with shipping before the 연동 change: every order
    //    that already exists carries status 입금완료 (rank 1) no matter how
    //    far its shipping got. The status backfill migration realigns the
    //    rows it safely can, but anything it deliberately skips (e.g. an
    //    unpaid-yet-shipped order) would otherwise become cancellable here
    //    despite having physically shipped — restoring stock for a tire that
    //    already left the warehouse.
    const shippedByStatusRank =
      orderStatusRank[order.status as OrderStatusValue] >= orderStatusRank[ORDER_STATUS.SHIPPING];
    const shippedByShippingStatus =
      order.shippingStatus === "SHIPPED" || order.shippingStatus === "DELIVERED";
    if (actor.kind !== "ADMIN" && (shippedByStatusRank || shippedByShippingStatus)) {
      throw new OrderDomainError("CANCEL_AFTER_SHIPPING");
    }

    const nextStatus =
      order.status === ORDER_STATUS.PAYMENT_PENDING
        ? CANCEL_STATUS.PAYMENT_BEFORE
        : CANCEL_STATUS.PAYMENT_AFTER;
    const markedCancelled = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: nextStatus,
        cancelReason: reason?.trim() || null,
      },
    });
    if (markedCancelled.count !== 1) {
      throw new OrderDomainError("ORDER_ALREADY_CANCELLED");
    }

    await tx.listing.update({
      where: { id: order.listingId },
      data: {
        stock: { increment: order.quantity },
        ...(order.listing.status === "SOLDOUT" ? { status: "ACTIVE" } : {}),
      },
    });

    // Cancelling an already-paid order (입금후취소) doesn't touch its Payment
    // by itself — the card was already charged, so the refund has to be
    // tracked (and, when nothing is left on the payment, actually reversed)
    // or it just disappears from the system.
    //
    // Only DB writes happen in this transaction. Calling Toss's cancel API
    // here would mean an external HTTP call that Postgres cannot roll back:
    // if Toss actually processed the cancellation but a later statement in
    // this same transaction then failed (or the transaction hit its
    // timeout), the refund would have gone out for real while the order
    // stayed un-cancelled, stock un-restored, and Payment stuck at DONE.
    // So the transaction only ever records "a refund is owed" durably;
    // cancelOrder calls Toss afterward, once that record is committed.
    if (nextStatus === CANCEL_STATUS.PAYMENT_AFTER && order.paymentId) {
      const payment = await tx.payment.findUnique({ where: { id: order.paymentId } });
      if (payment && payment.status === "DONE") {
        const cancelledOrderAmount = order.unitPrice * order.quantity + order.extraShipping;
        const remainingActiveOrders = await tx.order.count({
          where: {
            paymentId: payment.id,
            id: { not: orderId },
            status: { notIn: cancelledStatusValues },
          },
        });
        const isFullRefund = remainingActiveOrders === 0;

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            refundRequiredAt: new Date(),
            refundReason: isFullRefund
              ? "ALL_ORDERS_ON_PAYMENT_CANCELLED"
              : // Partial cancellation. Toss's partial-cancel call needs an
                // exact cancelAmount (and, for card payments, a
                // taxFreeAmount breakdown) that stays consistent with the
                // orders still active on this payment — this codebase
                // doesn't track per-order tax treatment, so computing that
                // automatically risks an incorrect live charge adjustment.
                // Recording the amount for a manual/admin-driven partial
                // refund is the safer choice here; it is never
                // auto-submitted to Toss.
                "ORDER_CANCELED_AFTER_PAYMENT",
            refundAmount: { increment: cancelledOrderAmount },
          },
        });

        if (isFullRefund) {
          fullRefundCandidate = { paymentId: payment.id, paymentKey: payment.paymentKey };
        }
      }
    }

    if (actor.kind === "ADMIN") {
      await tx.adminActionLog.create({
        data: {
          adminId: actor.userId,
          action: "CANCEL_ORDER",
          targetType: "ORDER",
          targetId: orderId,
          reason: reason?.trim() || null,
        },
      });
    }

    const cancelledOrder = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: buyerOrderInclude,
    });
    return { order: cancelledOrder, fullRefundCandidate };
  }); // default timeout is fine now that no external call runs inside the tx

  if (fullRefundCandidate) {
    await settleFullRefundViaToss(fullRefundCandidate.paymentId, fullRefundCandidate.paymentKey, orderId);
  }

  return toBuyerOrderView(updated);
}

// Task 2 — 구매확정: buyer-initiated, moves a 배송완료 order to 구매확정. Only
// valid from 배송완료 and only for the order's own buyer (mirrors the
// ownership check in cancelOrder's belongsToActor). Once this succeeds,
// cancelOrder's guard above refuses to cancel the order for any non-admin
// actor — rank(구매확정) sits above rank(배송중).
export async function confirmPurchase(orderId: string, buyerId: string) {
  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id: orderId } });
    if (!existing || existing.buyerId !== buyerId) {
      throw new OrderDomainError("ORDER_NOT_FOUND", 404);
    }
    if (existing.status !== ORDER_STATUS.SHIPPING_COMPLETED) {
      throw new OrderDomainError("PURCHASE_CONFIRM_INVALID_STATUS");
    }

    // Conditional updateMany guarded on the current status — same pattern as
    // cancelOrder/expireStaleUnpaidOrders — so a confirm racing a concurrent
    // cancel or shipping override can't clobber the other; whichever commits
    // first wins and the other matches 0 rows instead of overwriting it.
    const confirmed = await tx.order.updateMany({
      where: { id: orderId, status: ORDER_STATUS.SHIPPING_COMPLETED },
      data: { status: ORDER_STATUS.PURCHASE_CONFIRMED },
    });
    if (confirmed.count !== 1) {
      throw new OrderDomainError("PURCHASE_CONFIRM_INVALID_STATUS");
    }

    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: buyerOrderInclude });
  });

  return toBuyerOrderView(order);
}

export function shippingStatusValue(status: ShippingStatus) {
  return SHIPPING_STATUS_LABEL[status];
}

export type OrderItem = CartItem;
