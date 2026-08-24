// Shared client/server view types for 판매자 정산 (payout.ts). Mirrors the
// convention in admin-types.ts/seller-types.ts/settlement-types.ts: plain
// interfaces, every date pre-serialized to an ISO string so the client never
// touches a Prisma Date or Decimal directly.

export type PayoutStatus = "PENDING" | "CONFIRMED" | "PAID";

export interface PayoutPeriod {
  start: string;
  end: string;
}

// Live, not-yet-settled totals for a period — see payout.ts's summarizeOrders
// for exactly how these are derived (gross includes shipping, commission
// does not, net is always gross - commission by subtraction).
export interface PayoutAggregate {
  orderCount: number;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
}

// One confirmed/paid Settlement row, read back exactly as stored — once a
// settlement is confirmed these numbers are a snapshot, never recomputed.
export interface PayoutSettlementView {
  id: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  status: PayoutStatus;
  memo: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminPayoutSettlementView extends PayoutSettlementView {
  seller: {
    id: string;
    code: string;
    businessName: string;
  };
}

export interface SellerPayoutView {
  commissionRate: number;
  period: PayoutPeriod;
  unsettled: PayoutAggregate;
  settlements: PayoutSettlementView[];
}

export interface AdminUnsettledSellerRow extends PayoutAggregate {
  sellerId: string;
  sellerCode: string;
  businessName: string;
  commissionRate: number;
}

export interface AdminPayoutView {
  period: PayoutPeriod;
  unsettledBySeller: AdminUnsettledSellerRow[];
  settlements: AdminPayoutSettlementView[];
}
