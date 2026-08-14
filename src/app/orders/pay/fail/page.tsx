"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LoadingState from "@/components/LoadingState";
import RequireAuth from "@/components/RequireAuth";

function FailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <div className="px-4 py-10 max-w-2xl mx-auto">
      <div className="card p-6 text-center">
        <h1 className="text-xl font-extrabold">결제를 완료하지 못했습니다</h1>
        <p className="mt-3 text-sm text-muted">
          {message || "결제가 취소되었거나 결제 과정에서 문제가 발생했습니다."}
        </p>
        {code && <p className="mt-2 text-xs text-muted">오류 코드: {code}</p>}
        <Link href="/orders" className="btn-primary mt-6 inline-flex h-11 items-center px-5">
          주문내역에서 다시 결제하기
        </Link>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <RequireAuth allow={["BUYER"]}>
      <Suspense fallback={<LoadingState />}>
        <FailContent />
      </Suspense>
    </RequireAuth>
  );
}
