import { Prisma, type ShippingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { CartItem } from "@/lib/types";
import { CANCEL_STATUS, isCancelledOrderStatus, ORDER_STATUS, SHIPPING_STATUS_LABEL } from "@/lib/order-status";
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
      | "CANCEL_REASON_REQUIRED",
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

export async function getBuyerOrders(buyerId: string) {
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

async function cancelTossPaymentForRefund(paymentKey: string | null, reason: string): Promise<boolean> {
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
      headers: { Authorization: `Basic ${authorization}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cancelReason: reason }),
    });
    return response.ok;
  } catch (error) {
    console.error("TOSS_PAYMENT_CANCEL_REQUEST_FAILED", { paymentKey, error });
    return false;
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

  const updated = await prisma.$transaction(async (tx) => {
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
    if (
      actor.kind !== "ADMIN" &&
      (order.shippingStatus === "SHIPPED" || order.shippingStatus === "DELIVERED")
    ) {
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

        if (remainingActiveOrders === 0) {
          // Nothing is left on this payment — refund the full charge via
          // Toss instead of just flagging it, since there's nothing left for
          // the buyer to receive.
          const tossCancelSucceeded = await cancelTossPaymentForRefund(
            payment.paymentKey,
            "ALL_ORDERS_ON_PAYMENT_CANCELLED",
          );
          await tx.payment.update({
            where: { id: payment.id },
            data: tossCancelSucceeded
              ? {
                  status: "CANCELED",
                  refundRequiredAt: null,
                  refundReason: "FULLY_REFUNDED_VIA_TOSS_CANCEL",
                  refundAmount: { increment: cancelledOrderAmount },
                }
              : {
                  refundRequiredAt: new Date(),
                  refundReason: "ALL_ORDERS_CANCELLED_AUTO_REFUND_FAILED",
                  refundAmount: { increment: cancelledOrderAmount },
                },
          });
        } else {
          // Partial cancellation. Toss's partial-cancel call needs an exact
          // cancelAmount (and, for card payments, a taxFreeAmount breakdown)
          // that stays consistent with the orders still active on this
          // payment — this codebase doesn't track per-order tax treatment,
          // so computing that automatically risks an incorrect live charge
          // adjustment. Recording the amount for a manual/admin-driven
          // partial refund is the safer choice here.
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              refundRequiredAt: new Date(),
              refundReason: "ORDER_CANCELED_AFTER_PAYMENT",
              refundAmount: { increment: cancelledOrderAmount },
            },
          });
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

    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: buyerOrderInclude,
    });
  }, { timeout: 15_000 }); // higher timeout: this tx may call Toss's cancel API above

  return toBuyerOrderView(updated);
}

export function shippingStatusValue(status: ShippingStatus) {
  return SHIPPING_STATUS_LABEL[status];
}

export type OrderItem = CartItem;
