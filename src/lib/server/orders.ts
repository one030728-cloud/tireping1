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

async function findActiveListing(tx: Prisma.TransactionClient, item: OrderItemInput) {
  const commonWhere = {
    seller: { code: item.sellerCode },
    dot: item.dot,
    status: "ACTIVE" as const,
  };

  const byProductId = await tx.listing.findFirst({
    where: { ...commonWhere, productId: item.tireId },
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
  });

  return toBuyerOrderView(updated);
}

export function shippingStatusValue(status: ShippingStatus) {
  return SHIPPING_STATUS_LABEL[status];
}

export type OrderItem = CartItem;
