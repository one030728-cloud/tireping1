import { NextResponse } from "next/server";
import {
  buyerSignupSchema,
  createBuyerApplication,
} from "@/lib/server/buyer";
import { serverErrorResponse, validationResponse } from "@/lib/server/seller";
import { duplicateSignupFieldResponse } from "@/lib/server/signupErrors";
import { signupIpLimiter } from "@/lib/server/rateLimit";
import { getClientIp } from "@/lib/server/requestIp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitKey = `buyer:${getClientIp(request.headers)}`;
  if (signupIpLimiter.isBlocked(rateLimitKey)) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }
  // Count every submission toward the quota, not just failures — the thing
  // being capped is how many PENDING applications one source can create.
  signupIpLimiter.record(rateLimitKey);

  try {
    const payload = buyerSignupSchema.parse(await request.json());
    const application = await createBuyerApplication(payload);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    const invalid = validationResponse(error);
    if (invalid) return invalid;
    const duplicate = duplicateSignupFieldResponse(error);
    if (duplicate) return duplicate;
    return serverErrorResponse(error, "BUYER_SIGNUP_FAILED");
  }
}
