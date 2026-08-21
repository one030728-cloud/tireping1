// Shared client/server view types for the buyer's real financial history
// screens (입출금 내역 / 세금계산서 내역 / 추가비용 내역). Mirrors the
// AccountProfile convention in account-types.ts: one plain interface per
// view, all dates pre-serialized to ISO strings so the client never touches
// a Prisma Date directly.

// "-" (no refund happened at all), "COMPLETED" (Toss actually returned the
// money), or "PENDING" (a refund is owed but has not been executed yet —
// either a partial cancellation, which this app always routes to manual
// admin processing, or a full-cancel Toss call that failed). See
// src/lib/server/settlement.ts for exactly how this is derived from
// Payment.status/refundRequiredAt/refundReason.
export type DepositRefundStatus = "NONE" | "COMPLETED" | "PENDING";

export interface DepositEntry {
  paymentId: string;
  tossOrderId: string;
  itemLabel: string;
  paidAmount: number;
  refundAmount: number;
  refundStatus: DepositRefundStatus;
  refundStatusLabel: string;
  date: string;
}

export interface TaxMonthEntry {
  month: string;
  supplyAmount: number;
  vat: number;
  total: number;
}

export interface ExtraFeeEntry {
  orderId: string;
  itemLabel: string;
  extraShipping: number;
  orderedAt: string;
}

export interface SettlementView {
  // "BUYER": the real, per-user data below is populated. "NOT_APPLICABLE":
  // this session's role never has Payment/Order-as-buyer rows by
  // construction (see getSettlementView), so the arrays are intentionally
  // empty and scopeMessage explains why — the UI must show that message
  // instead of an empty table that could be mistaken for a loading bug.
  scope: "BUYER" | "NOT_APPLICABLE";
  scopeMessage: string | null;
  deposits: DepositEntry[];
  depositsTotal: number;
  taxYears: string[];
  taxByYear: Record<string, TaxMonthEntry[]>;
  extraFees: ExtraFeeEntry[];
  extraFeesTotal: number;
}
