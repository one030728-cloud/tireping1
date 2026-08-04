import { Prisma, type Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CANCEL_STATUS } from "@/lib/order-status";
import type { AccountProfile } from "@/lib/account-types";
import { prisma } from "./prisma";

const nullableText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

export const accountPatchSchema = z.object({
  email: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().email().max(160).nullable().optional(),
  ),
  notifyOptIn: z.boolean().optional(),
  postalCode: nullableText(20),
  address: nullableText(300),
  officePhone: nullableText(30),
  mobilePhone: z.string().trim().min(7).max(30).optional(),
  contact1: nullableText(80),
  contact2: nullableText(80),
  bankName: nullableText(80),
  bankAccountNumber: nullableText(80),
  bankAccountHolder: nullableText(80),
});

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(1).max(80),
  bankAccountNumber: z.string().trim().min(1).max(80),
  bankAccountHolder: z.string().trim().min(1).max(80),
});

export class AccountDomainError extends Error {
  constructor(
    public readonly code: "ACCOUNT_NOT_FOUND" | "ACCOUNT_ALREADY_WITHDRAWN" | "ACTIVE_ORDERS_EXIST",
    public readonly status = 409,
  ) {
    super(code);
    this.name = "AccountDomainError";
  }
}

const accountSelect = {
  id: true,
  loginId: true,
  role: true,
  email: true,
  notifyOptIn: true,
  businessName: true,
  businessRegNumber: true,
  businessType: true,
  businessCategory: true,
  ownerName: true,
  postalCode: true,
  address: true,
  officePhone: true,
  mobilePhone: true,
  contact1: true,
  contact2: true,
  bankName: true,
  bankAccountNumber: true,
  bankAccountHolder: true,
  bankAccountVerifiedAt: true,
  withdrawnAt: true,
} satisfies Prisma.UserSelect;

type AccountRecord = Prisma.UserGetPayload<{ select: typeof accountSelect }>;

function toAccountProfile(user: AccountRecord): AccountProfile {
  return {
    ...user,
    role: user.role as AccountProfile["role"],
    bankAccountVerifiedAt: user.bankAccountVerifiedAt?.toISOString() ?? null,
    withdrawnAt: user.withdrawnAt?.toISOString() ?? null,
  };
}

export function validationResponse(error: unknown) {
  if (!(error instanceof z.ZodError)) return null;
  return NextResponse.json(
    { error: "VALIDATION_ERROR", details: error.issues },
    { status: 400 },
  );
}

export function domainErrorResponse(error: unknown) {
  if (!(error instanceof AccountDomainError)) return null;
  return NextResponse.json({ error: error.code }, { status: error.status });
}

export function serverErrorResponse(error: unknown, message: string) {
  console.error(message, error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function getAccountProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: accountSelect });
  if (!user) throw new AccountDomainError("ACCOUNT_NOT_FOUND", 404);
  return toAccountProfile(user);
}

export async function updateAccountProfile(
  userId: string,
  data: z.infer<typeof accountPatchSchema>,
) {
  const bankChanged =
    data.bankName !== undefined ||
    data.bankAccountNumber !== undefined ||
    data.bankAccountHolder !== undefined;
  const user = await prisma.$transaction((tx) =>
    tx.user.update({
      where: { id: userId },
      data: {
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.notifyOptIn !== undefined ? { notifyOptIn: data.notifyOptIn } : {}),
        ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.officePhone !== undefined ? { officePhone: data.officePhone } : {}),
        ...(data.mobilePhone !== undefined ? { mobilePhone: data.mobilePhone } : {}),
        ...(data.contact1 !== undefined ? { contact1: data.contact1 } : {}),
        ...(data.contact2 !== undefined ? { contact2: data.contact2 } : {}),
        ...(data.bankName !== undefined ? { bankName: data.bankName } : {}),
        ...(data.bankAccountNumber !== undefined
          ? { bankAccountNumber: data.bankAccountNumber }
          : {}),
        ...(data.bankAccountHolder !== undefined
          ? { bankAccountHolder: data.bankAccountHolder }
          : {}),
        ...(bankChanged ? { bankAccountVerifiedAt: null } : {}),
      },
      select: accountSelect,
    }),
  );
  return toAccountProfile(user);
}

export async function saveBankAccount(
  userId: string,
  data: z.infer<typeof bankAccountSchema>,
) {
  const user = await prisma.$transaction((tx) =>
    tx.user.update({
      where: { id: userId },
      data: {
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountHolder: data.bankAccountHolder,
        // 1차 정책: 외부 실명조회 없이 항상 미인증 상태로 저장한다.
        bankAccountVerifiedAt: null,
      },
      select: accountSelect,
    }),
  );
  return toAccountProfile(user);
}

const cancelledStatuses = Object.values(CANCEL_STATUS);

export async function withdrawAccount(userId: string, role: Role) {
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { withdrawnAt: true } });
    if (!user) throw new AccountDomainError("ACCOUNT_NOT_FOUND", 404);
    if (user.withdrawnAt) throw new AccountDomainError("ACCOUNT_ALREADY_WITHDRAWN");

    if (role === "BUYER" || role === "SELLER") {
      const activeOrders = await tx.order.count({
        where: {
          ...(role === "BUYER" ? { buyerId: userId } : { sellerId: userId }),
          status: { notIn: cancelledStatuses },
          shippingStatus: { not: "DELIVERED" },
        },
      });
      if (activeOrders > 0) throw new AccountDomainError("ACTIVE_ORDERS_EXIST");
    }

    return tx.user.update({
      where: { id: userId },
      data: { withdrawnAt: new Date() },
      select: { withdrawnAt: true },
    });
  });
  if (!result.withdrawnAt) throw new Error("ACCOUNT_WITHDRAW_TIMESTAMP_MISSING");
  return { withdrawnAt: result.withdrawnAt.toISOString() };
}
