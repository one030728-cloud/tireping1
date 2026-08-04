import { getPublicProducts, toCatalogRows } from "@/lib/server/products";

export const runtime = "nodejs";

export async function GET() {
  try {
    const products = await getPublicProducts();
    return Response.json({ products: toCatalogRows(products) });
  } catch (error) {
    console.error("Failed to load public products", error);
    return Response.json({ error: "PRODUCTS_UNAVAILABLE" }, { status: 500 });
  }
}
