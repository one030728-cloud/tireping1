import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { CartItem } from "@/lib/types";
import { prisma } from "./prisma";

export const cartItemSchema = z.object({
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

export const cartQuantitySchema = z.object({
  quantity: z.coerce.number().int().min(1).max(100_000),
});

export class CartDomainError extends Error {
  constructor(
    public readonly code: "CART_ITEM_NOT_FOUND" | "CART_QUANTITY_EXCEEDED",
    public readonly status = 404,
  ) {
    super(code);
    this.name = "CartDomainError";
  }
}

function toCartItem(item: Prisma.CartItemGetPayload<object>): CartItem {
  return {
    id: item.id,
    tireId: item.tireId,
    manufacturer: item.manufacturer as CartItem["manufacturer"],
    model: item.model,
    width: item.width,
    ratio: item.ratio,
    rim: item.rim,
    dot: item.dot,
    price: item.price,
    quantity: item.quantity,
    extraShipping: item.extraShipping,
    sellerCode: item.sellerCode,
    ...(item.stock === null ? {} : { stock: item.stock }),
  };
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
  return NextResponse.json({ error: message }, { status: 500 });
}

export function domainErrorResponse(error: unknown) {
  if (!(error instanceof CartDomainError)) return null;
  return NextResponse.json({ error: error.code }, { status: error.status });
}

export async function getCartItems(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { id: "asc" },
  });
  return items.map(toCartItem);
}

export async function addCartItem(userId: string, data: z.infer<typeof cartItemSchema>) {
  const item = await prisma.$transaction(async (tx) => {
    const existing = await tx.cartItem.findFirst({
      where: { userId, tireId: data.tireId, sellerCode: data.sellerCode, dot: data.dot },
    });
    const nextQuantity = (existing?.quantity ?? 0) + data.quantity;
    if (nextQuantity > 100_000) throw new CartDomainError("CART_QUANTITY_EXCEEDED", 400);

    if (existing) {
      return tx.cartItem.update({
        where: { id: existing.id },
        data: {
          manufacturer: data.manufacturer,
          model: data.model,
          width: data.width,
          ratio: data.ratio,
          rim: data.rim,
          dot: data.dot,
          price: data.price,
          quantity: nextQuantity,
          extraShipping: data.extraShipping,
          stock: data.stock ?? null,
        },
      });
    }

    return tx.cartItem.create({
      data: {
        userId,
        tireId: data.tireId,
        manufacturer: data.manufacturer,
        model: data.model,
        width: data.width,
        ratio: data.ratio,
        rim: data.rim,
        dot: data.dot,
        price: data.price,
        quantity: data.quantity,
        extraShipping: data.extraShipping,
        sellerCode: data.sellerCode,
        stock: data.stock ?? null,
      },
    });
  });
  return toCartItem(item);
}

export async function updateCartItem(userId: string, itemId: string, quantity: number) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.cartItem.updateMany({
      where: { id: itemId, userId },
      data: { quantity },
    });
    if (updated.count !== 1) throw new CartDomainError("CART_ITEM_NOT_FOUND");
    const item = await tx.cartItem.findUniqueOrThrow({ where: { id: itemId } });
    return toCartItem(item);
  });
}

export async function removeCartItem(userId: string, itemId: string) {
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.cartItem.deleteMany({ where: { id: itemId, userId } });
    if (deleted.count !== 1) throw new CartDomainError("CART_ITEM_NOT_FOUND");
  });
}

export async function clearCart(userId: string) {
  await prisma.$transaction((tx) => tx.cartItem.deleteMany({ where: { userId } }));
}
