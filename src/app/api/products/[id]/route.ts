import type { NextRequest } from "next/server";
import { getPublicProduct, toProductView } from "@/lib/server/products";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = await getPublicProduct(id);

    if (!product) {
      return Response.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }

    const view = toProductView(product, request.nextUrl.searchParams.get("dot"));
    if (!view) {
      return Response.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }

    return Response.json({ product: view });
  } catch (error) {
    console.error("Failed to load public product", error);
    return Response.json({ error: "PRODUCT_UNAVAILABLE" }, { status: 500 });
  }
}
