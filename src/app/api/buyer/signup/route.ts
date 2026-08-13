import { NextResponse } from "next/server";
import {
  buyerSignupSchema,
  createBuyerApplication,
} from "@/lib/server/buyer";
import { serverErrorResponse, validationResponse } from "@/lib/server/seller";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = buyerSignupSchema.parse(await request.json());
    const application = await createBuyerApplication(payload);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    const invalid = validationResponse(error);
    if (invalid) return invalid;
    return serverErrorResponse(error, "BUYER_SIGNUP_FAILED");
  }
}
