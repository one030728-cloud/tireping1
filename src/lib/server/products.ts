import type { CatalogRow, Manufacturer } from "@/lib/types";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const publicListingSelect = {
  id: true,
  dot: true,
  loadIndex: true,
  speedIndex: true,
  ply: true,
  season: true,
  productCode: true,
  discountRate: true,
  price: true,
  factoryPrice: true,
  stock: true,
  minOrder: true,
  tag: true,
  createdAt: true,
  seller: {
    select: {
      code: true,
      courier: true,
      shippingNote: true,
    },
  },
} satisfies Prisma.ListingSelect;

const publicProductSelect = {
  id: true,
  manufacturer: true,
  model: true,
  width: true,
  ratio: true,
  rim: true,
  createdAt: true,
  listings: {
    where: { status: "ACTIVE" },
    orderBy: [{ createdAt: "asc" }, { price: "asc" }],
    select: publicListingSelect,
  },
} satisfies Prisma.ProductSelect;

export async function getPublicProducts() {
  return prisma.product.findMany({
    where: { listings: { some: { status: "ACTIVE" } } },
    orderBy: { createdAt: "asc" },
    select: publicProductSelect,
  });
}

export async function getPublicProduct(id: string) {
  return prisma.product.findFirst({
    where: { id, listings: { some: { status: "ACTIVE" } } },
    select: publicProductSelect,
  });
}

type PublicProducts = Awaited<ReturnType<typeof getPublicProducts>>;
type PublicProduct = PublicProducts[number];
type PublicListing = PublicProduct["listings"][number];

function groupByDot(listings: readonly PublicListing[]) {
  const groups = new Map<string, PublicListing[]>();
  for (const listing of listings) {
    const group = groups.get(listing.dot) ?? [];
    group.push(listing);
    groups.set(listing.dot, group);
  }
  return groups;
}

function toSeller(listing: PublicListing) {
  return {
    code: listing.seller.code,
    discountRate: Number(listing.discountRate),
    price: listing.price,
    stock: listing.stock,
    minOrder: listing.minOrder,
    shippingNote: listing.seller.shippingNote ?? "",
    courier: listing.seller.courier,
  };
}

function toCatalogRow(
  product: PublicProduct,
  dot: string,
  listings: readonly PublicListing[],
  hasMultipleDots: boolean,
  registeredOrder: number,
): CatalogRow {
  const first = listings[0];
  const prices = listings.map((listing) => listing.price);
  const tags = listings.map((listing) => listing.tag).filter(Boolean);

  return {
    id: `row-${product.id}-${dot}`,
    detailId: product.id,
    detailDot: hasMultipleDots ? dot : null,
    manufacturer: product.manufacturer as Manufacturer,
    model: product.model,
    width: product.width,
    ratio: product.ratio,
    rim: product.rim,
    spec: `${first.loadIndex} ${first.speedIndex} ${first.ply} ${first.season}`,
    productCode: first.productCode,
    dot,
    factoryPrice: first.factoryPrice,
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    stock: listings.reduce((total, listing) => total + listing.stock, 0),
    discountRate: Math.max(...listings.map((listing) => Number(listing.discountRate))),
    tag: (tags[0] as CatalogRow["tag"] | undefined) ?? null,
    registeredOrder,
  };
}

export function toCatalogRows(products: PublicProducts): CatalogRow[] {
  return products.flatMap((product, productIndex) => {
    const groups = groupByDot(product.listings);
    const hasMultipleDots = groups.size > 1;
    return Array.from(groups.entries()).map(([dot, listings]) =>
      toCatalogRow(product, dot, listings, hasMultipleDots, productIndex),
    );
  });
}

export function toProductView(product: PublicProduct, requestedDot: string | null) {
  const groups = groupByDot(product.listings);
  const fallbackDot = groups.keys().next().value;
  const dot = requestedDot && groups.has(requestedDot) ? requestedDot : fallbackDot;
  const listings = dot ? groups.get(dot) ?? [] : [];
  const first = listings[0];

  if (!first || !dot) return null;

  return {
    id: product.id,
    manufacturer: product.manufacturer as Manufacturer,
    model: product.model,
    width: product.width,
    ratio: product.ratio,
    rim: product.rim,
    dot,
    factoryPrice: first.factoryPrice,
    spec: {
      loadIndex: first.loadIndex,
      speedIndex: first.speedIndex,
      ply: first.ply,
      origin: "-",
      season: first.season,
      productCode: first.productCode,
    },
    sellers: [...listings].sort((a, b) => a.price - b.price).map(toSeller),
  };
}
