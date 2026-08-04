import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server/guard";
import {
  bankAccountSchema,
  domainErrorResponse,
  saveBankAccount,
  serverErrorResponse,
  validationResponse,
} from "@/lib/server/account";

export const runtime = "nodejs";

const AUTHENTICATED_ROLES = ["BUYER", "SELLER", "ADMIN"] as const;

export async function POST(request: Request) {
  const auth = await requireRole(AUTHENTICATED_ROLES);
  if (auth.response) return auth.response;

  try {
    const payload = bankAccountSchema.parse(await request.json());
    const profile = await saveBankAccount(auth.session.user.id, payload);
    return NextResponse.json({ profile, verified: false, status: "PENDING_ADMIN_REVIEW" });
  } catch (error) {
    const invalid = validationResponse(error);
    if (invalid) return invalid;
    const domain = domainErrorResponse(error);
    if (domain) return domain;
    return serverErrorResponse(error, "BANK_ACCOUNT_SAVE_FAILED");
  }
}
