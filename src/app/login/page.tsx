"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

function notSupported() {
  alert("데모 버전에서는 지원하지 않는 기능입니다.");
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace("/main");
    }
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(id, password);
    setSubmitting(false);
    if (result.ok) {
      router.push("/main");
    } else {
      setError(result.message ?? "로그인에 실패했습니다.");
    }
  }

  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 animate-[fade-slide-up_400ms_ease-out_both]">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-brand-light to-brand-dark bg-clip-text text-transparent">
            타이어존
          </h1>
          <p className="text-sm text-muted mt-1">사업자전용 타이어거래소</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card rounded-2xl p-6 flex flex-col gap-3 shadow-[var(--shadow-lg)] animate-[fade-slide-up_450ms_ease-out_both]"
        >
          <h2 className="text-center font-bold mb-1">회원 로그인</h2>

          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="아이디 입력"
            autoComplete="username"
            className="h-12 px-4 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            required
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="비밀번호 입력"
            autoComplete="current-password"
            className="h-12 px-4 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            required
          />

          {error && (
            <p key={error} className="text-sm text-accent animate-[shake_350ms_ease-out]">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary h-12 mt-2">
            {submitting ? "로그인 중..." : "로그인"}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted mt-1">
            <button type="button" onClick={notSupported} className="hover:text-brand">
              아이디 찾기
            </button>
            <span>·</span>
            <button type="button" onClick={notSupported} className="hover:text-brand">
              비밀번호 재설정
            </button>
            <span>·</span>
            <button type="button" onClick={notSupported} className="hover:text-brand">
              회원가입
            </button>
          </div>

          <div className="text-xs text-muted bg-surface-2 border border-dashed border-border-strong rounded-lg p-3 mt-2 leading-relaxed">
            데모 계정 · 아이디: <b className="text-foreground">demo</b> / 비밀번호:{" "}
            <b className="text-foreground">demo1234</b>
          </div>
        </form>
      </div>
    </div>
  );
}
