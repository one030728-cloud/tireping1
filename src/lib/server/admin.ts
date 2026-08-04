import { ListingStatus, Prisma, SellerStatus, type ShippingStatus } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "./guard";
import { prisma } from "./prisma";
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
} satisfies Prisma.OrderInclude;

type AdminSellerRecord = Prisma.SellerGetPayload<{ include: typeof adminSellerInclude }>;
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

    const shippingStatus = data.shippingStatus as ShippingStatus;
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        shippingStatus,
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
