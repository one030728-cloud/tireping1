"use client";

import RequireAuth from "@/components/RequireAuth";

function ExtraFeesContent() {
  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-1">추가비용 내역</h1>
      <p className="text-sm text-muted mb-1">총 0건</p>
      <p className="text-sm font-semibold mb-5">
        추가비용 합계 : <span className="text-brand">0원</span>
      </p>
      <div className="card p-10 text-center text-muted text-sm">
        조회된 추가비용 내역이 없습니다.
      </div>
    </div>
  );
}

export default function ExtraFeesPage() {
  return (
    <RequireAuth>
      <ExtraFeesContent />
    </RequireAuth>
  );
}
