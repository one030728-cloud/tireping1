import { NextResponse } from "next/server";
import { Prisma, type Role } from "@prisma/client";
import { CANCEL_STATUS } from "@/lib/order-status";
import type {
  DepositEntry,
  ExtraFeeEntry,
  SettlementView,
  TaxMonthEntry,
} from "@/lib/settlement-types";
import { prisma } from "./prisma";

export function serverErrorResponse(error: unknown, message: string) {
  console.error(message, error);
  return NextResponse.json({ error: message }, { status: 500 });
}

const cancelledStatusValues = Object.values(CANCEL_STATUS);

// Same "타이어" / "타이어 외 N건" convention /api/payments/toss/prepare uses to
// build the Toss orderName for a payment (see that route's `orderName`
// line) — reused as-is here rather than inventing a second label for the
// same concept, since a payment's 주문상품 label is exactly that orderName.
function paymentItemLabel(orderCount: number) {
  return orderCount <= 1 ? "타이어" : `타이어 외 ${orderCount - 1}건`;
}

const buyerPaymentInclude = {
  orders: { select: { id: true } },
} satisfies Prisma.PaymentInclude;

type BuyerPaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof buyerPaymentInclude;
}>;

// Distinguishes 환불완료 from 환불예정/처리중 for one Payment row. See the
// refundRequiredAt/refundReason handling in cancelOrder and
// settleFullRefundViaToss (src/lib/server/orders.ts):
//   - refundAmount > 0 && refundRequiredAt === null && status === "CANCELED"
//     only happens once settleFullRefundViaToss records that Toss's cancel
//     call actually returned success (refundReason "FULLY_REFUNDED_VIA_TOSS_CANCEL").
//     That is the only path that clears refundRequiredAt, so it is the only
//     state that may be shown as "환불완료".
//   - refundAmount > 0 with refundRequiredAt still set means money is owed
//     but has not left this payment yet — either a partial cancellation
//     (cancelOrder always routes those to manual/admin processing rather
//     than auto-submitting to Toss) or a full-cancel Toss call that failed
//     (refundReason "ALL_ORDERS_CANCELLED_AUTO_REFUND_FAILED"). Both must
//     read as pending, never as completed, or this screen would state a
//     refund happened when the buyer's money hasn't actually moved.
function toDepositEntry(payment: BuyerPaymentRecord): DepositEntry {
  const hasRefund = payment.refundAmount > 0;
  const refundCompleted = hasRefund && payment.refundRequiredAt === null && payment.status === "CANCELED";
  const refundStatus: DepositEntry["refundStatus"] = !hasRefund
    ? "NONE"
    : refundCompleted
      ? "COMPLETED"
      : "PENDING";
  const refundStatusLabel =
    refundStatus === "NONE" ? "-" : refundStatus === "COMPLETED" ? "환불완료" : "환불예정(처리중)";

  return {
    paymentId: payment.id,
    tossOrderId: payment.tossOrderId,
    itemLabel: paymentItemLabel(payment.orders.length),
    paidAmount: payment.amount,
    refundAmount: payment.refundAmount,
    refundStatus,
    refundStatusLabel,
    date: (payment.approvedAt ?? payment.requestedAt).toISOString(),
  };
}

async function getDeposits(buyerId: string) {
  // What belongs in an 입출금 내역 is "Toss actually approved a charge", and
  // `status` alone does NOT answer that — three different code paths set
  // CANCELED and only one of them involves money that ever moved:
  //   1. settleFullRefundViaToss (orders.ts) — was DONE, charged, then Toss's
  //      cancel succeeded. Real: charged then returned. Belongs here.
  //   2. confirm/route.ts's DB_SAVE_FAILED_AUTO_CANCELED — the charge was
  //      reversed before this payment was ever recorded as approved, so it
  //      nets to zero and its approvedAt was never set.
  //   3. prepare/route.ts's SUPERSEDED_BY_NEW_PAYMENT_PREPARE — a still-READY
  //      payment closed out because the buyer re-opened the payment page for
  //      the same orders. NOTHING WAS EVER CHARGED. This fires on an ordinary
  //      page refresh, so filtering on status alone would print a phantom
  //      "결제 {amount}원" row on this screen every time a buyer reopened
  //      checkout — reintroducing exactly the fabricated-money problem this
  //      screen was rewritten to remove.
  // `approvedAt` is the honest discriminator: it is set only by the two
  // confirm-route writes that follow a successful Toss approval, and nothing
  // ever clears it. READY/FAILED payments never have it either, so this one
  // condition covers every never-charged case on its own.
  const payments = await prisma.payment.findMany({
    where: { buyerId, status: { in: ["DONE", "CANCELED"] }, approvedAt: { not: null } },
    orderBy: [{ approvedAt: "desc" }, { requestedAt: "desc" }],
    include: buyerPaymentInclude,
  });

  const deposits = payments.map(toDepositEntry);
  // 합계 only counts refunds that actually completed — a refund that is
  // merely owed (PENDING) hasn't left the buyer's paid total yet, so
  // netting it out here would understate what was actually charged.
  const depositsTotal = deposits.reduce(
    (sum, d) => sum + d.paidAmount - (d.refundStatus === "COMPLETED" ? d.refundAmount : 0),
    0,
  );
  return { deposits, depositsTotal };
}

async function getTaxAggregate(buyerId: string) {
  // "실제로 결제된" orders only: the order itself must not be cancelled, and
  // it must sit on a payment that is currently DONE (still an active
  // charge). An order whose payment was fully refunded (CANCELED) is always
  // also cancelled itself (cancelOrder only marks a payment's full refund
  // once every order on it is cancelled), so excluding cancelled orders
  // already excludes that revenue — nothing here double-counts a refunded
  // sale as if it were still taxable turnover.
  const paidOrders = await prisma.order.findMany({
    where: {
      buyerId,
      paymentId: { not: null },
      status: { notIn: cancelledStatusValues },
      payment: { status: "DONE" },
    },
    select: {
      unitPrice: true,
      quantity: true,
      extraShipping: true,
      orderedAt: true,
      payment: { select: { approvedAt: true } },
    },
  });

  const monthlyTotals = new Map<string, number>();
  for (const order of paidOrders) {
    const total = order.unitPrice * order.quantity + order.extraShipping;
    const paidAt = order.payment?.approvedAt ?? order.orderedAt;
    const month = paidAt.toISOString().slice(0, 7); // "YYYY-MM"
    monthlyTotals.set(month, (monthlyTotals.get(month) ?? 0) + total);
  }

  const taxByYear: Record<string, TaxMonthEntry[]> = {};
  for (const [month, total] of monthlyTotals) {
    // Standard Korean 부가세 breakdown (합계 = 공급가액 + 부가세, VAT 10%).
    // This app only ever stores a tax-inclusive order total — there is no
    // per-line supply/VAT split anywhere — so 공급가액 is backed out of the
    // total rather than computed independently. That keeps every row
    // internally consistent (공급가액 + 부가세 === 합계 exactly), which
    // matters more for a 집계 reference screen than matching some
    // externally-issued invoice's rounding.
    const supplyAmount = Math.round(total / 1.1);
    const vat = total - supplyAmount;
    const year = month.slice(0, 4);
    (taxByYear[year] ??= []).push({ month, supplyAmount, vat, total });
  }
  for (const year of Object.keys(taxByYear)) {
    taxByYear[year].sort((a, b) => (a.month < b.month ? -1 : 1));
  }
  const taxYears = Object.keys(taxByYear).sort((a, b) => Number(b) - Number(a));

  return { taxYears, taxByYear };
}

async function getExtraFees(buyerId: string) {
  // Order.extraShipping is the only additional-cost field this schema has.
  // Cancelled orders are excluded: a cancelled order's extra fee was either
  // never actually charged (cancelled before payment) or is already folded
  // into that payment's refundAmount (cancelled after payment) — showing it
  // again here as a live extra charge would double up on money already
  // accounted for on the deposits screen.
  const orders = await prisma.order.findMany({
    where: { buyerId, extraShipping: { gt: 0 }, status: { notIn: cancelledStatusValues } },
    orderBy: { orderedAt: "desc" },
    include: { listing: { include: { product: true } } },
  });

  const extraFees: ExtraFeeEntry[] = orders.map((order) => ({
    orderId: order.id,
    itemLabel: `${order.listing.product.manufacturer} ${order.listing.product.model}`,
    extraShipping: order.extraShipping,
    orderedAt: order.orderedAt.toISOString(),
  }));
  const extraFeesTotal = extraFees.reduce((sum, e) => sum + e.extraShipping, 0);
  return { extraFees, extraFeesTotal };
}

const EMPTY_SETTLEMENT: Omit<SettlementView, "scope" | "scopeMessage"> = {
  deposits: [],
  depositsTotal: 0,
  taxYears: [],
  taxByYear: {},
  extraFees: [],
  extraFeesTotal: 0,
};

export async function getSettlementView(userId: string, role: Role): Promise<SettlementView> {
  // Only a BUYER-role account can ever hold Payment rows or place Order rows
  // (enforced by requireRole(["BUYER"]) on /api/orders and every
  // /api/payments/toss/* route) — a SELLER or ADMIN session has zero rows
  // here by construction, not because of a bug or a missing query. Skip the
  // queries entirely and say so, rather than rendering tables that look
  // empty by accident.
  if (role !== "BUYER") {
    return {
      scope: "NOT_APPLICABLE",
      scopeMessage:
        "입출금·세금계산서·추가비용 내역은 구매(결제) 계정 기준으로 집계됩니다. 현재 계정은 결제 내역을 보유하지 않는 역할이라 표시할 내역이 없습니다.",
      ...EMPTY_SETTLEMENT,
    };
  }

  const [{ deposits, depositsTotal }, { taxYears, taxByYear }, { extraFees, extraFeesTotal }] =
    await Promise.all([getDeposits(userId), getTaxAggregate(userId), getExtraFees(userId)]);

  return {
    scope: "BUYER",
    scopeMessage: null,
    deposits,
    depositsTotal,
    taxYears,
    taxByYear,
    extraFees,
    extraFeesTotal,
  };
}
