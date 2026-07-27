"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { MyListing } from "./types";
import { MY_LISTINGS } from "./mockData";

const STORAGE_KEY = "tirezone_listings";

interface ListingsContextValue {
  listings: MyListing[];
  addListing: (listing: Omit<MyListing, "id" | "registeredAt" | "status">) => void;
  removeListing: (id: string) => void;
  toggleStatus: (id: string) => void;
}

const ListingsContext = createContext<ListingsContextValue | null>(null);

function formatDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function ListingsProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<MyListing[]>(MY_LISTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration after mount, required to avoid SSR/client markup mismatch
        setListings(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
    }
  }, [listings, hydrated]);

  const addListing: ListingsContextValue["addListing"] = (listing) => {
    setListings((prev) => [
      {
        ...listing,
        id: `ml-${Date.now()}`,
        status: listing.stock > 0 ? "판매중" : "품절",
        registeredAt: formatDate(new Date()),
      },
      ...prev,
    ]);
  };

  const removeListing = (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const toggleStatus = (id: string) => {
    setListings((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status: l.status === "판매중" ? "품절" : "판매중" } : l,
      ),
    );
  };

  return (
    <ListingsContext.Provider value={{ listings, addListing, removeListing, toggleStatus }}>
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error("useListings must be used within ListingsProvider");
  return ctx;
}
