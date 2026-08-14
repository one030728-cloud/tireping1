import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ORDER_STATUS } from "@/lib/order-status";
import { prisma } from "@/lib/server/prisma";
import { requireRole } from "@/lib/server/guard";

export const runtime = "nodejs";

const preparePaymentSchema = z.object({
  orderIds: z
    .array(z.string().trim().min(1).max(200))
    .min(1)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, "DUPLICATE_ORDER_IDS"),
});

export async function POST(request: Request) {
  const auth = await requireRole(["BUYER"]);
  if (auth.response) return auth.response;

  const parsed = preparePaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const clientKey = process.env.TOSS_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json({ error: "TOSS_CLIENT_KEY_MISSING" }, { status: 503 });
  }

  const { orderIds } = parsed.data;
  const orders = await prisma.order.findMany({
    where: {
      id: { in: orderIds },
      buyerId: auth.session.user.id,
    },
    include: { listing: { include: { product: true } } },
  });

  const areValidOrders =
    orders.length === orderIds.length &&
    orders.every((order) => order.status === ORDER_STATUS.PAYMENT_PENDING);
  if (!areValidOrders) {
    return NextResponse.json(
      { error: "ORDERS_MUST_BE_OWNED_AND_PAYMENT_PENDING" },
      { status: 400 },
    );
  }

  const amount = orders.reduce(
    (total, order) => total + order.unitPrice * order.quantity + order.extraShipping,
    0,
  );
  if (amount <= 0) {
    return NextResponse.json({ error: "INVALID_PAYMENT_AMOUNT" }, { status: 400 });
  }

  const orderName = orders.length === 1 ? "타이어" : `타이어 외 ${orders.length - 1}건`;

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          tossOrderId: `order_${randomUUID()}`,
          buyerId: auth.session.user.id,
          amount,
          status: "READY",
        },
      });

      const updatedOrders = await tx.order.updateMany({
        where: {
          id: { in: orderIds },
          buyerId: auth.session.user.id,
          status: ORDER_STATUS.PAYMENT_PENDING,
        },
        data: { paymentId: createdPayment.id },
      });

      if (updatedOrders.count !== orderIds.length) {
        throw new Error("PAYMENT_PREPARE_CONFLICT");
      }

      return createdPayment;
    });

    return NextResponse.json({
      tossOrderId: payment.tossOrderId,
      amount,
      orderName,
      clientKey,
    });
  } catch (error) {
    console.error("TOSS_PAYMENT_PREPARE_FAILED", error);
    return NextResponse.json({ error: "PAYMENT_PREPARE_FAILED" }, { status: 409 });
  }
}
