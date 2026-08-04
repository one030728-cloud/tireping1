import { hash } from "bcryptjs";
import { ListingStatus, Prisma, type ShippingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "./prisma";
import { requireRole } from "./guard";

const nullableText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

const tagSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.enum(["EVENT", "BEST"]).nullable().optional(),
);

export const listingSchema = z.object({
  manufacturer: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(160),
  width: z.coerce.number().int().min(1).max(999),
  ratio: z.coerce.number().int().min(1).max(999),
  rim: z.coerce.number().int().min(1).max(99),
  dot: z.string().trim().min(1).max(20),
  loadIndex: z.string().trim().min(1).max(20),
  speedIndex: z.string().trim().min(1).max(20),
  ply: z.string().trim().min(1).max(20),
  oe: nullableText(40),
  season: z.string().trim().min(1).max(80),
  productCode: z.string().trim().min(1).max(80),
  discountRate: z.coerce.number().min(0).max(100),
  price: z.coerce.number().int().min(0).max(100_000_000),
  factoryPrice: z.coerce.number().int().min(0).max(100_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  minOrder: z.coerce.number().int().min(1).max(100_000),
  tag: tagSchema,
  shippingNote: nullableText(500),
  courier: z.string().trim().min(1).max(80).optional(),
  imageUrls: z.array(z.string().trim().url().max(2_000)).max(10).optional(),
});

export const listingPatchSchema = listingSchema.partial();

export const sellerSignupSchema = z.object({
  loginId: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9._-]+$/),
  password: z.string().min(8).max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  businessName: z.string().trim().min(1).max(120),
  businessRegNumber: z.string().trim().min(1).max(40),
  ownerName: z.string().trim().min(1).max(80),
  mobilePhone: z.string().trim().min(7).max(30),
  courier: z.string().trim().min(1).max(80),
  email: nullableText(160),
  businessType: nullableText(80),
  businessCategory: nullableText(120),
  postalCode: nullableText(20),
  address: nullableText(300),
  officePhone: nullableText(30),
  contact1: nullableText(80),
  contact2: nullableText(80),
  shippingNote: nullableText(500),
  location: nullableText(120),
  intro: nullableText(500),
});

export const shippingSchema = z.object({
  shippingStatus: z.enum(["PREPARING", "TRACKING_REGISTERED", "SHIPPED", "DELIVERED"]),
  courier: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(120).optional(),
});

const sellerListingInclude = {
  product: true,
  seller: {
    select: {
      id: true,
      code: true,
      courier: true,
      shippingNote: true,
      location: true,
      intro: true,
    },
  },
  images: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ListingInclude;

const sellerOrderInclude = {
  listing: {
    include: {
      product: true,
      seller: { select: { code: true } },
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

type SellerListingRecord = Prisma.ListingGetPayload<{
  include: typeof sellerListingInclude;
}>;

type SellerOrderRecord = Prisma.OrderGetPayload<{
  include: typeof sellerOrderInclude;
}>;

export type SellerListingView = ReturnType<typeof toListingView>;
export type SellerOrderView = ReturnType<typeof toOrderView>;

export async function requireSeller() {
  const auth = await requireRole(["SELLER"]);

  if (auth.response) {
    return { session: null, sellerId: null, response: auth.response } as const;
  }

  const sellerId = auth.session.user.sellerId;
  if (!sellerId) {
    return {
      session: null,
      sellerId: null,
      response: NextResponse.json({ error: "SELLER_PROFILE_REQUIRED" }, { status: 403 }),
    } as const;
  }

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { status: true },
  });
  if (!seller || seller.status !== "ACTIVE") {
    return {
      session: null,
      sellerId: null,
      response: NextResponse.json({ error: "SELLER_INACTIVE" }, { status: 403 }),
    } as const;
  }

  return { session: auth.session, sellerId, response: null } as const;
}

export function validationResponse(error: unknown) {
  if (!(error instanceof z.ZodError)) return null;
  return NextResponse.json(
    { error: "VALIDATION_ERROR", details: error.issues },
    { status: 400 },
  );
}

export function serverErrorResponse(error: unknown, message = "SELLER_REQUEST_FAILED") {
  console.error(message, error);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "DUPLICATE_RESOURCE" }, { status: 409 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

function toListingView(listing: SellerListingRecord) {
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
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    seller: listing.seller,
    images: listing.images.map((image) => ({
      id: image.id,
      url: image.url,
      sortOrder: image.sortOrder,
    })),
  };
}

function toOrderView(order: SellerOrderRecord) {
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
    buyer: order.buyer,
  };
}

export async function getSellerListings(sellerId: string, status?: string) {
  const validStatus = status && Object.values(ListingStatus).includes(status as ListingStatus)
    ? (status as ListingStatus)
    : undefined;

  const listings = await prisma.listing.findMany({
    where: { sellerId, ...(validStatus ? { status: validStatus } : {}) },
    orderBy: { updatedAt: "desc" },
    include: sellerListingInclude,
  });
  return listings.map(toListingView);
}

export async function getSellerListing(sellerId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, sellerId },
    include: sellerListingInclude,
  });
  return listing ? toListingView(listing) : null;
}

function productKey(data: {
  manufacturer: string;
  model: string;
  width: number;
  ratio: number;
  rim: number;
}) {
  return {
    manufacturer_model_width_ratio_rim: {
      manufacturer: data.manufacturer,
      model: data.model,
      width: data.width,
      ratio: data.ratio,
      rim: data.rim,
    },
  };
}

export async function createSellerListing(
  sellerId: string,
  data: z.infer<typeof listingSchema>,
) {
  const listing = await prisma.$transaction(async (tx) => {
    const product = await tx.product.upsert({
      where: productKey(data),
      create: {
        manufacturer: data.manufacturer,
        model: data.model,
        width: data.width,
        ratio: data.ratio,
        rim: data.rim,
      },
      update: {},
    });

    const created = await tx.listing.create({
      data: {
        productId: product.id,
        sellerId,
        status: "DRAFT",
        dot: data.dot,
        loadIndex: data.loadIndex,
        speedIndex: data.speedIndex,
        ply: data.ply,
        oe: data.oe ?? null,
        season: data.season,
        productCode: data.productCode,
        discountRate: data.discountRate,
        price: data.price,
        factoryPrice: data.factoryPrice,
        stock: data.stock,
        minOrder: data.minOrder,
        tag: data.tag ?? null,
        ...(data.imageUrls
          ? { images: { create: data.imageUrls.map((url, index) => ({ url, sortOrder: index })) } }
          : {}),
      },
    });

    if (data.courier !== undefined || data.shippingNote !== undefined) {
      await tx.seller.update({
        where: { id: sellerId },
        data: {
          ...(data.courier !== undefined ? { courier: data.courier } : {}),
          ...(data.shippingNote !== undefined ? { shippingNote: data.shippingNote } : {}),
        },
      });
    }

    return tx.listing.findUniqueOrThrow({
      where: { id: created.id },
      include: sellerListingInclude,
    });
  });

  return toListingView(listing);
}

const CORE_FIELDS = [
  "manufacturer",
  "model",
  "width",
  "ratio",
  "rim",
  "dot",
  "loadIndex",
  "speedIndex",
  "ply",
  "oe",
  "season",
  "productCode",
] as const;

export async function updateSellerListing(
  sellerId: string,
  listingId: string,
  data: z.infer<typeof listingPatchSchema>,
  changedBy: string,
) {
  const listing = await prisma.$transaction(async (tx) => {
    const existing = await tx.listing.findFirst({
      where: { id: listingId, sellerId },
      include: { product: true },
    });
    if (!existing) return null;

    const nextProduct = {
      manufacturer: data.manufacturer ?? existing.product.manufacturer,
      model: data.model ?? existing.product.model,
      width: data.width ?? existing.product.width,
      ratio: data.ratio ?? existing.product.ratio,
      rim: data.rim ?? existing.product.rim,
    };
    const currentValues: Record<string, unknown> = {
      manufacturer: existing.product.manufacturer,
      model: existing.product.model,
      width: existing.product.width,
      ratio: existing.product.ratio,
      rim: existing.product.rim,
      dot: existing.dot,
      loadIndex: existing.loadIndex,
      speedIndex: existing.speedIndex,
      ply: existing.ply,
      oe: existing.oe,
      season: existing.season,
      productCode: existing.productCode,
    };
    const nextValues: Record<string, unknown> = {
      manufacturer: nextProduct.manufacturer,
      model: nextProduct.model,
      width: nextProduct.width,
      ratio: nextProduct.ratio,
      rim: nextProduct.rim,
      dot: data.dot ?? existing.dot,
      loadIndex: data.loadIndex ?? existing.loadIndex,
      speedIndex: data.speedIndex ?? existing.speedIndex,
      ply: data.ply ?? existing.ply,
      oe: data.oe !== undefined ? data.oe : existing.oe,
      season: data.season ?? existing.season,
      productCode: data.productCode ?? existing.productCode,
    };
    const coreChanged = CORE_FIELDS.some(
      (field) => String(currentValues[field] ?? "") !== String(nextValues[field] ?? ""),
    );

    const nextStock = data.stock ?? existing.stock;
    let status = existing.status;
    if (coreChanged && existing.status === "ACTIVE") status = "PENDING";
    if (nextStock === 0 && (status === "ACTIVE" || status === "SOLDOUT")) status = "SOLDOUT";
    if (nextStock > 0 && status === "SOLDOUT" && !coreChanged) status = "ACTIVE";

    const product = await tx.product.upsert({
      where: productKey(nextProduct),
      create: nextProduct,
      update: {},
    });

    const priceChanges = [
      ["price", existing.price, data.price],
      ["discountRate", Number(existing.discountRate), data.discountRate],
      ["stock", existing.stock, data.stock],
      ["factoryPrice", existing.factoryPrice, data.factoryPrice],
    ].flatMap(([field, oldValue, newValue]) =>
      newValue !== undefined && oldValue !== newValue
        ? [{ field: String(field), oldValue: String(oldValue), newValue: String(newValue), changedBy }]
        : [],
    );

    const updated = await tx.listing.update({
      where: { id: listingId },
      data: {
        productId: product.id,
        ...(data.dot !== undefined ? { dot: data.dot } : {}),
        ...(data.loadIndex !== undefined ? { loadIndex: data.loadIndex } : {}),
        ...(data.speedIndex !== undefined ? { speedIndex: data.speedIndex } : {}),
        ...(data.ply !== undefined ? { ply: data.ply } : {}),
        ...(data.oe !== undefined ? { oe: data.oe } : {}),
        ...(data.season !== undefined ? { season: data.season } : {}),
        ...(data.productCode !== undefined ? { productCode: data.productCode } : {}),
        ...(data.discountRate !== undefined ? { discountRate: data.discountRate } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.factoryPrice !== undefined ? { factoryPrice: data.factoryPrice } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
        ...(data.minOrder !== undefined ? { minOrder: data.minOrder } : {}),
        ...(data.tag !== undefined ? { tag: data.tag } : {}),
        status,
        ...(coreChanged && existing.status === "ACTIVE"
          ? {
              submittedAt: new Date(),
              rejectedReason: null,
              reviewedAt: null,
              reviewedBy: null,
            }
          : {}),
        ...(priceChanges.length ? { priceHistory: { create: priceChanges } } : {}),
      },
    });

    if (data.imageUrls !== undefined) {
      await tx.listingImage.deleteMany({ where: { listingId } });
      if (data.imageUrls.length) {
        await tx.listingImage.createMany({
          data: data.imageUrls.map((url, index) => ({ listingId, url, sortOrder: index })),
        });
      }
    }

    if (data.courier !== undefined || data.shippingNote !== undefined) {
      await tx.seller.update({
        where: { id: sellerId },
        data: {
          ...(data.courier !== undefined ? { courier: data.courier } : {}),
          ...(data.shippingNote !== undefined ? { shippingNote: data.shippingNote } : {}),
        },
      });
    }

    return tx.listing.findUniqueOrThrow({
      where: { id: updated.id },
      include: sellerListingInclude,
    });
  });

  return listing ? toListingView(listing) : null;
}

export async function submitSellerListing(sellerId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({ where: { id: listingId, sellerId } });
  if (!listing) return { kind: "NOT_FOUND" as const };
  if (listing.status !== "DRAFT" && listing.status !== "REJECTED") {
    return { kind: "INVALID_STATUS" as const, status: listing.status };
  }

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: "PENDING",
      submittedAt: new Date(),
      rejectedReason: null,
    },
    include: sellerListingInclude,
  });
  return { kind: "OK" as const, listing: toListingView(updated) };
}

export async function deleteSellerListing(sellerId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findFirst({ where: { id: listingId, sellerId } });
    if (!listing) return { kind: "NOT_FOUND" as const };
    if (listing.status !== "DRAFT") {
      return { kind: "INVALID_STATUS" as const, status: listing.status };
    }

    await tx.listingPriceChange.deleteMany({ where: { listingId } });
    await tx.listingImage.deleteMany({ where: { listingId } });
    await tx.listing.delete({ where: { id: listingId } });
    const remaining = await tx.listing.count({ where: { productId: listing.productId } });
    if (remaining === 0) await tx.product.delete({ where: { id: listing.productId } });
    return { kind: "OK" as const };
  });
}

export async function createSellerApplication(data: z.infer<typeof sellerSignupSchema>) {
  const passwordHash = await hash(data.password, 10);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        loginId: data.loginId,
        passwordHash,
        role: "SELLER",
        email: data.email ?? null,
        businessName: data.businessName,
        businessRegNumber: data.businessRegNumber,
        businessType: data.businessType ?? null,
        businessCategory: data.businessCategory ?? null,
        ownerName: data.ownerName,
        postalCode: data.postalCode ?? null,
        address: data.address ?? null,
        officePhone: data.officePhone ?? null,
        mobilePhone: data.mobilePhone,
        contact1: data.contact1 ?? null,
        contact2: data.contact2 ?? null,
      },
    });

    return tx.seller.create({
      data: {
        userId: user.id,
        code: data.code,
        status: "PENDING",
        courier: data.courier,
        shippingNote: data.shippingNote ?? null,
        location: data.location ?? null,
        intro: data.intro ?? null,
      },
      select: { id: true, code: true, status: true },
    });
  });
}

export async function getSellerOrders(sellerId: string) {
  const orders = await prisma.order.findMany({
    where: { sellerId },
    orderBy: { orderedAt: "desc" },
    include: sellerOrderInclude,
  });
  return orders.map(toOrderView);
}

const shippingRank: Record<ShippingStatus, number> = {
  PREPARING: 0,
  TRACKING_REGISTERED: 1,
  SHIPPED: 2,
  DELIVERED: 3,
};

export async function updateSellerShipping(
  sellerId: string,
  orderId: string,
  data: z.infer<typeof shippingSchema>,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, sellerId },
    include: sellerOrderInclude,
  });
  if (!order) return { kind: "NOT_FOUND" as const };

  const nextStatus = data.shippingStatus as ShippingStatus;
  if (shippingRank[nextStatus] < shippingRank[order.shippingStatus]) {
    return { kind: "INVALID_TRANSITION" as const };
  }

  const trackingNumber = data.trackingNumber?.trim() || order.trackingNumber;
  if ((nextStatus === "TRACKING_REGISTERED" || nextStatus === "SHIPPED") && !trackingNumber) {
    return { kind: "TRACKING_REQUIRED" as const };
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      shippingStatus: nextStatus,
      ...(data.courier !== undefined ? { courier: data.courier || null } : {}),
      ...(data.trackingNumber !== undefined ? { trackingNumber: data.trackingNumber || null } : {}),
      ...(nextStatus === "SHIPPED" && !order.shippedAt ? { shippedAt: new Date() } : {}),
      ...(nextStatus === "DELIVERED" && !order.deliveredAt ? { deliveredAt: new Date() } : {}),
    },
    include: sellerOrderInclude,
  });
  return { kind: "OK" as const, order: toOrderView(updated) };
}
