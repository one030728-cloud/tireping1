import { NextResponse } from "next/server";
import {
  createSellerApplication,
  sellerSignupSchema,
  serverErrorResponse,
  validationResponse,
} from "@/lib/server/seller";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = sellerSignupSchema.parse(await request.json());
    const application = await createSellerApplication(payload);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    const invalid = validationResponse(error);
    if (invalid) return invalid;
    return serverErrorResponse(error, "SELLER_SIGNUP_FAILED");
  }
}
