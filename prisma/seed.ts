import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  FACTORY_TIRES,
  TIRES,
  TIRE_SPECS,
  getSellersForTire,
} from "../src/lib/mockData";
import type { Tire } from "../src/lib/types";

const prisma = new PrismaClient();
const PASSWORD_ROUNDS = 10;

type SeedAdmin = { id: string };

function normalFactoryPrice(price: number, discountRate: number) {
  return Math.round((price / (1 - discountRate / 100)) / 100) * 100;
}

function sellerLoginId(code: string) {
  return `seller_${code.toLowerCase()}`;
}

async function createBaseUsers() {
  const demoPasswordHash = await bcrypt.hash("demo1234", PASSWORD_ROUNDS);
  const configuredAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production" && !configuredAdminPassword) {
    throw new Error(
      "SEED_ADMIN_PASSWORD must be set when running the seed script in production.",
    );
  }

  const adminPassword = configuredAdminPassword ?? "admin1234";
  const adminPasswordHash = await bcrypt.hash(adminPassword, PASSWORD_ROUNDS);

  const demo = await prisma.user.upsert({
    where: { loginId: "demo" },
    create: {
      id: "seed-buyer-demo",
      loginId: "demo",
      passwordHash: demoPasswordHash,
      role: "BUYER",
      businessName: "산악타이어상사",
      businessRegNumber: "000-00-00000",
      ownerName: "홍길동",
      mobilePhone: "010-1234-5678",
    },
    update: {
      passwordHash: demoPasswordHash,
      role: "BUYER",
      businessName: "산악타이어상사",
      ownerName: "홍길동",
      mobilePhone: "010-1234-5678",
      withdrawnAt: null,
    },
  });

  const admin = await prisma.user.upsert({
    where: { loginId: "admin" },
    create: {
      id: "seed-admin",
      loginId: "admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      businessName: "타이어존 본사",
      businessRegNumber: "000-00-00001",
      ownerName: "관리자",
      mobilePhone: "010-0000-0000",
    },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      businessName: "타이어존 본사",
      ownerName: "관리자",
      mobilePhone: "010-0000-0000",
      withdrawnAt: null,
    },
  });

  return { demo, admin };
}

async function upsertSeller(
  sellerInput: ReturnType<typeof getSellersForTire>[number],
  admin: SeedAdmin,
) {
  const user = await prisma.user.upsert({
    where: { loginId: sellerLoginId(sellerInput.code) },
    create: {
      id: `seed-user-${sellerInput.code.toLowerCase()}`,
      loginId: sellerLoginId(sellerInput.code),
      passwordHash: await bcrypt.hash("seller1234", PASSWORD_ROUNDS),
      role: "SELLER",
      businessName: `판매점 ${sellerInput.code}`,
      businessRegNumber: `SEED-${sellerInput.code}`,
      ownerName: `판매자 ${sellerInput.code}`,
      mobilePhone: "010-0000-0000",
    },
    update: {
      role: "SELLER",
      businessName: `판매점 ${sellerInput.code}`,
      ownerName: `판매자 ${sellerInput.code}`,
      mobilePhone: "010-0000-0000",
      withdrawnAt: null,
    },
  });

  return prisma.seller.upsert({
    where: { code: sellerInput.code },
    create: {
      id: `seed-seller-${sellerInput.code.toLowerCase()}`,
      userId: user.id,
      code: sellerInput.code,
      status: "ACTIVE",
      courier: sellerInput.courier,
      shippingNote: sellerInput.shippingNote,
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
    update: {
      userId: user.id,
      status: "ACTIVE",
      courier: sellerInput.courier,
      shippingNote: sellerInput.shippingNote,
      approvedAt: new Date(),
      approvedBy: admin.id,
      suspendReason: null,
    },
  });
}

async function upsertProduct(
  manufacturer: string,
  model: string,
  width: number,
  ratio: number,
  rim: number,
) {
  return prisma.product.upsert({
    where: {
      manufacturer_model_width_ratio_rim: { manufacturer, model, width, ratio, rim },
    },
    create: { manufacturer, model, width, ratio, rim },
    update: {},
  });
}

async function upsertListing(input: {
  id: string;
  productId: string;
  sellerId: string;
  dot: string;
  loadIndex: string;
  speedIndex: string;
  ply: string;
  season: string;
  productCode: string;
  discountRate: number;
  price: number;
  factoryPrice: number;
  stock: number;
  minOrder: number;
  tag: string | null;
  adminId: string;
}) {
  const now = new Date();
  const status = input.stock > 0 ? "ACTIVE" : "SOLDOUT";

  return prisma.listing.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      productId: input.productId,
      sellerId: input.sellerId,
      status,
      dot: input.dot,
      loadIndex: input.loadIndex,
      speedIndex: input.speedIndex,
      ply: input.ply,
      season: input.season,
      productCode: input.productCode,
      discountRate: input.discountRate,
      price: input.price,
      factoryPrice: input.factoryPrice,
      stock: input.stock,
      minOrder: input.minOrder,
      tag: input.tag,
      submittedAt: now,
      reviewedAt: now,
      reviewedBy: input.adminId,
    },
    update: {
      productId: input.productId,
      sellerId: input.sellerId,
      status,
      rejectedReason: null,
      dot: input.dot,
      loadIndex: input.loadIndex,
      speedIndex: input.speedIndex,
      ply: input.ply,
      season: input.season,
      productCode: input.productCode,
      discountRate: input.discountRate,
      price: input.price,
      factoryPrice: input.factoryPrice,
      stock: input.stock,
      minOrder: input.minOrder,
      tag: input.tag,
      submittedAt: now,
      reviewedAt: now,
      reviewedBy: input.adminId,
    },
  });
}

async function seedTires(admin: SeedAdmin) {
  let listingCount = 0;

  for (const tire of TIRES) {
    const product = await upsertProduct(tire.manufacturer, tire.model, tire.width, tire.ratio, tire.rim);
    const spec = TIRE_SPECS[tire.id];

    for (const sellerInput of getSellersForTire(tire)) {
      const seller = await upsertSeller(sellerInput, admin);
      await upsertListing({
        id: `seed-listing-${tire.id}-${sellerInput.code.toLowerCase()}`,
        productId: product.id,
        sellerId: seller.id,
        dot: tire.dot,
        loadIndex: spec?.loadIndex ?? "-",
        speedIndex: spec?.speedIndex ?? "-",
        ply: spec?.ply ?? "-",
        season: spec?.season ?? "-",
        productCode: spec?.productCode ?? tire.id.toUpperCase(),
        discountRate: sellerInput.discountRate,
        price: sellerInput.price,
        factoryPrice: normalFactoryPrice(tire.price, tire.discountRate),
        stock: sellerInput.stock,
        minOrder: sellerInput.minOrder,
        tag: tire.tag,
        adminId: admin.id,
      });
      listingCount += 1;
    }
  }

  return listingCount;
}

function factorySpecFields(spec: string) {
  const [loadIndex = "-", speedIndex = "-", ply = "-", ...rest] = spec.split(" ");
  return {
    loadIndex,
    speedIndex,
    ply,
    season: rest.join(" ") || "-",
  };
}

async function seedFactoryTires(admin: SeedAdmin) {
  let listingCount = 0;

  for (const group of FACTORY_TIRES) {
    const product = await upsertProduct(
      group.manufacturer,
      group.model,
      group.width,
      group.ratio,
      group.rim,
    );
    const spec = factorySpecFields(group.spec);

    for (const row of group.rows) {
      // Factory rows have no seller in mockData, so use the same fallback seller
      // generator used by the existing catalog for a Tire without explicit sellers.
      const factoryTire: Tire = {
        id: group.id,
        manufacturer: group.manufacturer,
        model: group.model,
        width: group.width,
        ratio: group.ratio,
        rim: group.rim,
        dot: row.dot,
        discountRate: row.discountRate,
        price: row.price,
        tag: null,
        stock: row.stock,
      };

      for (const sellerInput of getSellersForTire(factoryTire)) {
        const seller = await upsertSeller(sellerInput, admin);
        await upsertListing({
          id: `seed-listing-${group.id}-${row.dot}-${sellerInput.code.toLowerCase()}`,
          productId: product.id,
          sellerId: seller.id,
          dot: row.dot,
          loadIndex: spec.loadIndex,
          speedIndex: spec.speedIndex,
          ply: spec.ply,
          season: spec.season,
          productCode: `${group.id}${row.dot}`.toUpperCase(),
          discountRate: sellerInput.discountRate,
          price: sellerInput.price,
          factoryPrice: group.factoryPrice,
          stock: sellerInput.stock,
          minOrder: sellerInput.minOrder,
          tag: null,
          adminId: admin.id,
        });
        listingCount += 1;
      }
    }
  }

  return listingCount;
}

async function main() {
  const { demo, admin } = await createBaseUsers();
  const tireListings = await seedTires(admin);
  const factoryListings = await seedFactoryTires(admin);
  const [userCount, sellerCount, productCount, listingCount] = await Promise.all([
    prisma.user.count(),
    prisma.seller.count(),
    prisma.product.count(),
    prisma.listing.count(),
  ]);

  console.log(`Seeded buyer: ${demo.loginId}`);
  console.log(`Seeded admin: ${admin.loginId}`);
  console.log(`Seeded tire listings: ${tireListings}`);
  console.log(`Seeded factory listings: ${factoryListings}`);
  console.log(
    `Database totals — users: ${userCount}, sellers: ${sellerCount}, products: ${productCount}, listings: ${listingCount}`,
  );
  console.log("Legacy GOODS/EVENTS/NOTICES remain in src/lib/mockData.ts because the schema has no corresponding models.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
