"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "./types";

const STORAGE_KEY = "tirezone_user";

const MOCK_ACCOUNT = { id: "demo", password: "demo1234" };

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (id: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration after mount, required to avoid SSR/client markup mismatch
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login: AuthContextValue["login"] = async (id, password) => {
    await new Promise((r) => setTimeout(r, 300));
    if (id !== MOCK_ACCOUNT.id || password !== MOCK_ACCOUNT.password) {
      return { ok: false, message: "아이디 또는 비밀번호가 일치하지 않습니다." };
    }
    const loggedInUser: User = {
      id,
      businessName: "산악타이어상사",
      ownerName: "홍길동",
      phone: "010-1234-5678",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
