"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { WishSeller } from "./types";
import { WISH_SELLERS } from "./mockData";

const STORAGE_KEY = "tirezone_wishlist";

interface WishlistContextValue {
  sellers: WishSeller[];
  isWished: (code: string) => boolean;
  toggleWish: (seller: Omit<WishSeller, "wishedAt">) => void;
  removeWish: (id: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

function formatDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [sellers, setSellers] = useState<WishSeller[]>(WISH_SELLERS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration after mount, required to avoid SSR/client markup mismatch
        setSellers(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sellers));
    }
  }, [sellers, hydrated]);

  const isWished = (code: string) => sellers.some((s) => s.code === code);

  const toggleWish: WishlistContextValue["toggleWish"] = (seller) => {
    setSellers((prev) => {
      const existing = prev.find((s) => s.code === seller.code);
      if (existing) {
        return prev.filter((s) => s.code !== seller.code);
      }
      return [{ ...seller, wishedAt: formatDate(new Date()) }, ...prev];
    });
  };

  const removeWish = (id: string) => {
    setSellers((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <WishlistContext.Provider value={{ sellers, isWished, toggleWish, removeWish }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
