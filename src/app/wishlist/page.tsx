"use client";

import { Star } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { useWishlist } from "@/lib/wishlist";

function WishlistContent() {
  const { sellers, removeWish } = useWishlist();

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-1">찜한 판매업체</h1>
      <p className="text-sm text-muted mb-5">총 {sellers.length} 업체</p>

      {sellers.length === 0 ? (
        <div className="card py-16 text-center text-muted animate-[fade-slide-up_400ms_ease-out_both]">
          <Star size={32} className="mx-auto mb-3 text-border" strokeWidth={1.5} />
          찜한 판매업체가 없습니다.
        </div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto card">
            <table className="w-full min-w-[720px] text-sm border-collapse">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-3 px-4 font-medium">업체구분</th>
                  <th className="py-3 px-4 font-medium">업체코드 / 방문</th>
                  <th className="py-3 px-4 font-medium">업체 소재지</th>
                  <th className="py-3 px-4 font-medium">업체 소개글</th>
                  <th className="py-3 px-4 font-medium">찜한일자</th>
                  <th className="py-3 px-4 font-medium">삭제</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0 hover:bg-background"
                  >
                    <td className="py-3 px-4">{s.type}</td>
                    <td className="py-3 px-4 font-medium">{s.code}</td>
                    <td className="py-3 px-4">{s.location}</td>
                    <td className="py-3 px-4">{s.intro}</td>
                    <td className="py-3 px-4">{s.wishedAt}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => removeWish(s.id)}
                        className="text-xs text-muted hover:text-accent"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden flex flex-col gap-3">
            {sellers.map((s, i) => (
              <div
                key={s.id}
                className="card card-hover p-4 animate-[fade-slide-up_400ms_ease-out_both]"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-xs text-muted mb-0.5">{s.type}</p>
                    <p className="font-semibold">{s.code}</p>
                  </div>
                  <button
                    onClick={() => removeWish(s.id)}
                    className="text-xs text-muted hover:text-accent shrink-0"
                  >
                    삭제
                  </button>
                </div>
                <p className="text-sm text-muted">{s.intro}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted">
                  <span>{s.location}</span>
                  <span>{s.wishedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function WishlistPage() {
  return (
    <RequireAuth>
      <WishlistContent />
    </RequireAuth>
  );
}
