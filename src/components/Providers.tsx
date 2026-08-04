"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { ListingsProvider } from "@/lib/listings";
import { OrdersProvider } from "@/lib/orders";
import { WishlistProvider } from "@/lib/wishlist";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <OrdersProvider>
          <WishlistProvider>
            <CartProvider>
              <ListingsProvider>{children}</ListingsProvider>
            </CartProvider>
          </WishlistProvider>
        </OrdersProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
