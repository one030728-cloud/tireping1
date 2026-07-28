import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { ListingsProvider } from "@/lib/listings";
import { OrdersProvider } from "@/lib/orders";
import { WishlistProvider } from "@/lib/wishlist";
import Header from "@/components/Header";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "타이어존 | 사업자전용 타이어거래소",
  description: "타이어 판매업자를 위한 B2B 타이어 거래 플랫폼 데모",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <OrdersProvider>
            <WishlistProvider>
              <CartProvider>
                <ListingsProvider>
                  <Header />
                  <AppShell>{children}</AppShell>
                </ListingsProvider>
              </CartProvider>
            </WishlistProvider>
          </OrdersProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
