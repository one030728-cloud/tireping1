import { NextResponse } from "next/server";
import { z } from "zod";
import { ORDER_STATUS } from "@/lib/order-status";
import { prisma } from "@/lib/server/prisma";
import { requireRole } from "@/lib/server/guard";

export const runtime = "nodejs";

const confirmPaymentSchema = z.object({
  paymentKey: z.string().trim().min(1).max(200),
  orderId: z.string().trim().min(1).max(200),
  amount: z.coerce.number().int().positive(),
});

type TossConfirmResponse = {
  code?: string;
  message?: string;
  method?: string;
};

async function markPaymentFailed(paymentId: string, reason: string) {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: "READY" },
    data: {
      status: "FAILED",
      failReason: reason.slice(0, 1_000),
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireRole(["BUYER"]);
  if (auth.response) return auth.response;

  const parsed = confirmPaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { paymentKey, orderId: tossOrderId, amount } = parsed.data;
  const payment = await prisma.payment.findFirst({
    where: {
      tossOrderId,
      buyerId: auth.session.user.id,
    },
    include: { orders: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  }
  if (payment.status !== "READY") {
    return NextResponse.json({ error: "PAYMENT_NOT_READY" }, { status: 409 });
  }
  if (payment.amount !== amount) {
    return NextResponse.json({ error: "PAYMENT_AMOUNT_MISMATCH" }, { status: 400 });
  }

  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "TOSS_SECRET_KEY_MISSING" }, { status: 503 });
  }

  const authorization = Buffer.from(`${secretKey}:`).toString("base64");
  let tossResponse: Response;
  let tossBody: TossConfirmResponse;

  try {
    tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId: tossOrderId, amount }),
    });
    tossBody = (await tossResponse.json().catch(() => ({}))) as TossConfirmResponse;
  } catch (error) {
    console.error("TOSS_PAYMENT_CONFIRM_REQUEST_FAILED", error);
    await markPaymentFailed(payment.id, "TOSS_CONFIRM_REQUEST_FAILED");
    return NextResponse.json({ error: "TOSS_PAYMENT_CONFIRM_FAILED" }, { status: 502 });
  }

  if (!tossResponse.ok) {
    const failReason = tossBody.message ?? tossBody.code ?? "TOSS_PAYMENT_CONFIRM_FAILED";
    await markPaymentFailed(payment.id, failReason);
    return NextResponse.json(
      { error: "TOSS_PAYMENT_CONFIRM_FAILED", code: tossBody.code },
      { status: 400 },
    );
  }

  try {
    const completedPayment = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.updateMany({
        where: { id: payment.id, status: "READY" },
        data: {
          status: "DONE",
          paymentKey,
          method: tossBody.method ?? null,
          approvedAt: new Date(),
          failReason: null,
        },
      });

      if (updatedPayment.count !== 1) {
        throw new Error("PAYMENT_CONFIRM_CONFLICT");
      }

      await tx.order.updateMany({
        where: { paymentId: payment.id },
        data: { status: ORDER_STATUS.PAYMENT_COMPLETED },
      });

      return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    });

    return NextResponse.json({
      payment: {
        tossOrderId: completedPayment.tossOrderId,
        status: completedPayment.status,
        method: completedPayment.method,
        approvedAt: completedPayment.approvedAt?.toISOString() ?? null,
        orderCount: payment.orders.length,
      },
    });
  } catch (error) {
    console.error("TOSS_PAYMENT_CONFIRM_SAVE_FAILED", error);
    return NextResponse.json({ error: "PAYMENT_CONFIRM_SAVE_FAILED" }, { status: 409 });
  }
}
