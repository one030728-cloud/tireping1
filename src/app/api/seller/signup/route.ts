import { NextResponse } from "next/server";
import {
  createSellerApplication,
  sellerSignupSchema,
  serverErrorResponse,
  validationResponse,
} from "@/lib/server/seller";
import { duplicateSignupFieldResponse } from "@/lib/server/signupErrors";
import { signupIpLimiter } from "@/lib/server/rateLimit";
import { getClientIp } from "@/lib/server/requestIp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitKey = `seller:${getClientIp(request.headers)}`;
  if (signupIpLimiter.isBlocked(rateLimitKey)) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }
  // Count every submission toward the quota, not just failures — the thing
  // being capped is how many PENDING applications one source can create.
  signupIpLimiter.record(rateLimitKey);

  try {
    const payload = sellerSignupSchema.parse(await request.json());
    const application = await createSellerApplication(payload);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    const invalid = validationResponse(error);
    if (invalid) return invalid;
    const duplicate = duplicateSignupFieldResponse(error);
    if (duplicate) return duplicate;
    return serverErrorResponse(error, "SELLER_SIGNUP_FAILED");
  }
}
