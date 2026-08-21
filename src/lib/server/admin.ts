import { BuyerStatus, ListingStatus, Prisma, SellerStatus, type ShippingStatus } from "@prisma/client";
import { z } from "zod";
import { isCancelledOrderStatus, nextOrderStatusForShipping } from "@/lib/order-status";
import { requireRole } from "./guard";
import { prisma } from "./prisma";
import { expireStaleUnpaidOrders } from "./orders";
import { shippingSchema, serverErrorResponse, validationResponse } from "./seller";

const adminSellerInclude = {
  user: {
    select: {
      id: true,
      loginId: true,
      businessName: true,
      businessRegNumber: true,
      ownerName: true,
      email: true,
      mobilePhone: true,
      officePhone: true,
      postalCode: true,
      address: true,
      createdAt: true,
    },
  },
  _count: { select: { listings: true } },
} satisfies Prisma.SellerInclude;

const adminBuyerInclude = {
  user: {
    select: {
      id: true,
      loginId: true,
      businessName: true,
      businessRegNumber: true,
      ownerName: true,
      email: true,
      mobilePhone: true,
      officePhone: true,
      postalCode: true,
      address: true,
      createdAt: true,
    },
  },
} satisfies Prisma.BuyerInclude;

const adminListingInclude = {
  product: true,
  seller: {
    select: {
      id: true,
      code: true,
      status: true,
      user: { select: { businessName: true, ownerName: true } },
    },
  },
} satisfies Prisma.ListingInclude;

const adminOrderInclude = {
  listing: {
    include: {
      product: true,
      seller: {
        select: {
          id: true,
          code: true,
          user: { select: { businessName: true } },
        },
      },
    },
  },
  buyer: {
    select: {
      businessName: true,
      ownerName: true,
      mobilePhone: true,
      officePhone: true,
      postalCode: true,
      address: true,
    },
  },
  payment: {
    select: {
      id: true,
      status: true,
      refundRequiredAt: true,
      refundReason: true,
      refundAmount: true,
    },
  },
} satisfies Prisma.OrderInclude;

type AdminSellerRecord = Prisma.SellerGetPayload<{ include: typeof adminSellerInclude }>;
type AdminBuyerRecord = Prisma.BuyerGetPayload<{ include: typeof adminBuyerInclude }>;
type AdminListingRecord = Prisma.ListingGetPayload<{ include: typeof adminListingInclude }>;
type AdminOrderRecord = Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>;

export const adminReviewSchema = z.object({
  approve: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export const adminSuspendSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const adminShippingSchema = shippingSchema.extend({
  reason: z.string().trim().max(500).optional(),
});

export async function requireAdmin() {
  const auth = await requireRole(["ADMIN"]);
  if (auth.response) {
    return { session: null, adminId: null, response: auth.response } as const;
  }
  return { session: auth.session, adminId: auth.session.user.id, response: null } as const;
}

export { serverErrorResponse, validationResponse };

function toAdminSellerView(seller: AdminSellerRecord) {
  return {
    id: seller.id,
    code: seller.code,
    status: seller.status,
    courier: seller.courier,
    shippingNote: seller.shippingNote,
    location: seller.location,
    intro: seller.intro,
    approvedAt: seller.approvedAt?.toISOString() ?? null,
    suspendReason: seller.suspendReason,
    user: {
      ...seller.user,
      createdAt: seller.user.createdAt.toISOString(),
    },
    listingCount: seller._count.listings,
  };
}

function toAdminBuyerView(buyer: AdminBuyerRecord) {
  return {
    id: buyer.id,
    status: buyer.status,
    approvedAt: buyer.approvedAt?.toISOString() ?? null,
    approvedBy: buyer.approvedBy,
    rejectedReason: buyer.rejectedReason,
    suspendReason: buyer.suspendReason,
    user: {
      ...buyer.user,
      createdAt: buyer.user.createdAt.toISOString(),
    },
  };
}

function toAdminListingView(listing: AdminListingRecord) {
  return {
    id: listing.id,
    status: listing.status,
    rejectedReason: listing.rejectedReason,
    manufacturer: listing.product.manufacturer,
    model: listing.product.model,
    width: listing.product.width,
    ratio: listing.product.ratio,
    rim: listing.product.rim,
    dot: listing.dot,
    loadIndex: listing.loadIndex,
    speedIndex: listing.speedIndex,
    ply: listing.ply,
    oe: listing.oe,
    season: listing.season,
    productCode: listing.productCode,
    discountRate: Number(listing.discountRate),
    price: listing.price,
    factoryPrice: listing.factoryPrice,
    stock: listing.stock,
    minOrder: listing.minOrder,
    tag: listing.tag,
    submittedAt: listing.submittedAt?.toISOString() ?? null,
    reviewedAt: listing.reviewedAt?.toISOString() ?? null,
    updatedAt: listing.updatedAt.toISOString(),
    seller: {
      id: listing.seller.id,
      code: listing.seller.code,
      status: listing.seller.status,
      businessName: listing.seller.user.businessName,
      ownerName: listing.seller.user.ownerName,
    },
  };
}

function toAdminOrderView(order: AdminOrderRecord) {
  return {
    id: order.id,
    listingId: order.listingId,
    sellerId: order.sellerId,
    status: order.status,
    shippingStatus: order.shippingStatus,
    courier: order.courier,
    trackingNumber: order.trackingNumber,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    extraShipping: order.extraShipping,
    total: order.unitPrice * order.quantity + order.extraShipping,
    orderedAt: order.orderedAt.toISOString(),
    shippedAt: order.shippedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    product: {
      manufacturer: order.listing.product.manufacturer,
      model: order.listing.product.model,
      width: order.listing.product.width,
      ratio: order.listing.product.ratio,
      rim: order.listing.product.rim,
      dot: order.listing.dot,
      sellerCode: order.listing.seller.code,
    },
    seller: {
      id: order.listing.seller.id,
      code: order.listing.seller.code,
      businessName: order.listing.seller.user.businessName,
    },
    buyer: order.buyer,
    payment: order.payment
      ? {
          id: order.payment.id,
          status: order.payment.status,
          refundRequiredAt: order.payment.refundRequiredAt?.toISOString() ?? null,
          refundReason: order.payment.refundReason,
          refundAmount: order.payment.refundAmount,
        }
      : null,
  };
}

export async function getAdminSellers(status?: string) {
  const validStatus = status && Object.values(SellerStatus).includes(status as SellerStatus)
    ? (status as SellerStatus)
    : undefined;
  const sellers = await prisma.seller.findMany({
    where: validStatus ? { status: validStatus } : undefined,
    orderBy: { user: { createdAt: "desc" } },
    include: adminSellerInclude,
  });
  return sellers.map(toAdminSellerView);
}

export async function approveAdminSeller(sellerId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const seller = await tx.seller.findUnique({ where: { id: sellerId } });
    if (!seller) return { kind: "NOT_FOUND" as const };
    if (seller.status !== "PENDING") {
      return { kind: "INVALID_STATUS" as const, status: seller.status };
    }

    const updated = await tx.seller.update({
      where: { id: sellerId },
      data: {
        status: "ACTIVE",
        approvedAt: new Date(),
        approvedBy: adminId,
        suspendReason: null,
      },
      include: adminSellerInclude,
    });
    await tx.adminActionLog.create({
      data: {
        adminId,
        action: "SELLER_APPROVE",
        targetType: "Seller",
        targetId: sellerId,
      },
    });
    return { kind: "OK" as const, seller: toAdminSellerView(updated) };
  });
}

export async function suspendAdminSeller(sellerId: string, adminId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const seller = await tx.seller.findUnique({ where: { id: sellerId } });
    if (!seller) return { kind: "NOT_FOUND" as const };
    if (seller.status === "SUSPENDED") {
      return { kind: "INVALID_STATUS" as const, status: seller.status };
    }

    const updated = await tx.seller.update({
      where: { id: sellerId },
      data: { status: "SUSPENDED", suspendReason: reason },
      include: adminSellerInclude,
    });
    // getPublicProducts/getPublicProduct and findActiveListing already filter
    // out listings from a non-ACTIVE seller, so this isn't required for
    // correctness — but flipping the listings to HIDDEN keeps the seller's
    // own listing dashboard honest while they're suspended, instead of
    // showing listings as "판매중" that no buyer can actually see or order.
    // There's no seller "reinstate from SUSPENDED" flow in this codebase
    // (approveAdminSeller only accepts PENDING -> ACTIVE), so there is
    // nothing to restore HIDDEN -> ACTIVE from yet; add that alongside a
    // future unsuspend action rather than guessing at its policy here.
    await tx.listing.updateMany({
      where: { sellerId, status: "ACTIVE" },
      data: { status: "HIDDEN" },
    });
    await tx.adminActionLog.create({
      data: {
        adminId,
        action: "SELLER_SUSPEND",
        targetType: "Seller",
        targetId: sellerId,
        reason,
      },
    });
    return { kind: "OK" as const, seller: toAdminSellerView(updated) };
  });
}

export async function getAdminBuyers(status?: string) {
  const validStatus = status && Object.values(BuyerStatus).includes(status as BuyerStatus)
    ? (status as BuyerStatus)
    : undefined;
  const buyers = await prisma.buyer.findMany({
    where: validStatus ? { status: validStatus } : undefined,
    orderBy: { user: { createdAt: "desc" } },
    include: adminBuyerInclude,
  });
  return buyers.map(toAdminBuyerView);
}

export async function approveAdminBuyer(buyerId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const buyer = await tx.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer) return { kind: "NOT_FOUND" as const };
    if (buyer.status !== "PENDING") {
      return { kind: "INVALID_STATUS" as const, status: buyer.status };
    }

    const updated = await tx.buyer.update({
      where: { id: buyerId },
      data: {
        status: "ACTIVE",
        approvedAt: new Date(),
        approvedBy: adminId,
        rejectedReason: null,
        suspendReason: null,
      },
      include: adminBuyerInclude,
    });
    await tx.adminActionLog.create({
      data: {
        adminId,
        action: "BUYER_APPROVE",
        targetType: "Buyer",
        targetId: buyerId,
      },
    });
    return { kind: "OK" as const, buyer: toAdminBuyerView(updated) };
  });
}

export async function rejectAdminBuyer(buyerId: string, adminId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const buyer = await tx.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer) return { kind: "NOT_FOUND" as const };
    if (buyer.status !== "PENDING") {
      return { kind: "INVALID_STATUS" as const, status: buyer.status };
    }

    const updated = await tx.buyer.update({
      where: { id: buyerId },
      data: { status: "REJECTED", rejectedReason: reason },
      include: adminBuyerInclude,
    });
    await tx.adminActionLog.create({
      data: {
        adminId,
        action: "BUYER_REJECT",
        targetType: "Buyer",
        targetId: buyerId,
        reason,
      },
    });
    return { kind: "OK" as const, buyer: toAdminBuyerView(updated) };
  });
}

export async function suspendAdminBuyer(buyerId: string, adminId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const buyer = await tx.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer) return { kind: "NOT_FOUND" as const };
    if (buyer.status === "SUSPENDED") {
      return { kind: "INVALID_STATUS" as const, status: buyer.status };
    }

    const updated = await tx.buyer.update({
      where: { id: buyerId },
      data: { status: "SUSPENDED", suspendReason: reason },
      include: adminBuyerInclude,
    });
    await tx.adminActionLog.create({
      data: {
        adminId,
        action: "BUYER_SUSPEND",
        targetType: "Buyer",
        targetId: buyerId,
        reason,
      },
    });
    return { kind: "OK" as const, buyer: toAdminBuyerView(updated) };
  });
}

export async function getAdminListings(status?: string) {
  const validStatus = status && Object.values(ListingStatus).includes(status as ListingStatus)
    ? (status as ListingStatus)
    : undefined;
  const listings = await prisma.listing.findMany({
    where: validStatus ? { status: validStatus } : undefined,
    orderBy: { updatedAt: "desc" },
    include: adminListingInclude,
  });
  const priority: Record<ListingStatus, number> = {
    PENDING: 0,
    REJECTED: 1,
    DRAFT: 2,
    ACTIVE: 3,
    SOLDOUT: 4,
    HIDDEN: 5,
  };
  return listings
    .sort((a, b) => priority[a.status] - priority[b.status])
    .map(toAdminListingView);
}

export async function reviewAdminListing(
  listingId: string,
  adminId: string,
  data: z.infer<typeof adminReviewSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) return { kind: "NOT_FOUND" as const };
    if (listing.status !== "PENDING") {
      return { kind: "INVALID_STATUS" as const, status: listing.status };
    }
    if (!data.approve && !data.reason?.trim()) {
      return { kind: "REASON_REQUIRED" as const };
    }

    const status = data.approve ? (listing.stock > 0 ? "ACTIVE" : "SOLDOUT") : "REJECTED";
    const updated = await tx.listing.update({
      where: { id: listingId },
      data: {
        status,
        rejectedReason: data.approve ? null : data.reason,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
      include: adminListingInclude,
    });
    await tx.adminActionLog.create({
      data: {
        adminId,
        action: data.approve ? "LISTING_APPROVE" : "LISTING_REJECT",
        targetType: "Listing",
        targetId: listingId,
        reason: data.approve ? null : data.reason,
      },
    });
    return { kind: "OK" as const, listing: toAdminListingView(updated) };
  });
}

export async function getAdminOrders() {
  // Unlike getBuyerOrders/getSellerOrders, the admin order list is
  // intentionally global (every buyer/seller's orders), so this expiry pass
  // isn't scoped to a single user — pass an empty filter to expire stale
  // 입금대기 orders across the whole table. See expireStaleUnpaidOrders in
  // src/lib/server/orders.ts for why this lazy expiry exists at all.
  await expireStaleUnpaidOrders({});

  const orders = await prisma.order.findMany({
    orderBy: { orderedAt: "desc" },
    include: adminOrderInclude,
  });
  return orders.map(toAdminOrderView);
}

export async function updateAdminShipping(
  orderId: string,
  adminId: string,
  data: z.infer<typeof adminShippingSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return { kind: "NOT_FOUND" as const };

    // Deliberately no unpaid/cancelled guard here (unlike updateSellerShipping):
    // this codebase already carves admins out of the equivalent restriction in
    // cancelOrder (`actor.kind !== "ADMIN"`), so admins are trusted to
    // override shipping state on a cancelled or unpaid order too — e.g. to
    // correct a mistake a seller already made under the guard below.
    const shippingStatus = data.shippingStatus as ShippingStatus;

    // order.status must still never be resurrected on a cancelled order, even
    // though shippingStatus itself is allowed to change above. Unlike
    // updateSellerShipping (which never reaches this point on a cancelled
    // order at all, thanks to its earlier guard), this path has no such
    // guard, so it checks isCancelledOrderStatus explicitly here rather than
    // relying on nextOrderStatusForShipping's rank lookup happening to return
    // null for an unranked status — that's an implementation detail of the
    // shared helper, not a contract this must-never-happen invariant should
    // depend on. The shipping write itself (below) still goes through
    // unconditionally either way, preserving the admin override.
    const advancedOrderStatus = isCancelledOrderStatus(order.status)
      ? null
      : nextOrderStatusForShipping(order.status, shippingStatus);

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        shippingStatus,
        ...(advancedOrderStatus ? { status: advancedOrderStatus } : {}),
        ...(data.courier !== undefined ? { courier: data.courier || null } : {}),
        ...(data.trackingNumber !== undefined ? { trackingNumber: data.trackingNumber || null } : {}),
        ...(shippingStatus === "SHIPPED" && !order.shippedAt ? { shippedAt: new Date() } : {}),
        ...(shippingStatus === "DELIVERED" && !order.deliveredAt ? { deliveredAt: new Date() } : {}),
      },
      include: adminOrderInclude,
    });
    await tx.adminActionLog.create({
      data: {
        adminId,
        action: "ORDER_SHIPPING_OVERRIDE",
        targetType: "Order",
        targetId: orderId,
        reason: data.reason ?? null,
      },
    });
    return { kind: "OK" as const, order: toAdminOrderView(updated) };
  });
}
