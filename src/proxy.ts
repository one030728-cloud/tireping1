import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type ProtectedRole = "SELLER" | "ADMIN";

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "redirect",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Seller signup is explicitly public; all other seller/admin pages require a role.
  if (pathname === "/seller/signup" || pathname.startsWith("/seller/signup/")) {
    return NextResponse.next();
  }

  const requiredRole: ProtectedRole | null = pathname.startsWith("/seller")
    ? "SELLER"
    : pathname.startsWith("/admin")
      ? "ADMIN"
      : null;

  if (!requiredRole) return NextResponse.next();

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return redirectToLogin(request);

  try {
    const token = await getToken({ req: request, secret });
    if (token?.role !== requiredRole) return redirectToLogin(request);
  } catch {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/seller/:path*", "/admin/:path*"],
};
