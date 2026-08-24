"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  "/main": "홈",
  "/events": "이벤트",
  "/factory-price": "공장도가 확인",
  "/products": "일반 상품목록",
  "/direct": "당일직배송 상품목록",
  "/sell": "타이어판매",
  "/goods": "정비용품 구매",
  "/exhibition": "기획전",
  "/customer": "고객센터",
  "/wishlist": "찜한 판매업체",
  "/cart": "타이어 장바구니",
  "/mypage/status": "주문 / 배송 현황",
  "/mypage/orders": "주문내역 / 배송조회",
  "/mypage/deposits": "입출금 내역",
  "/mypage/extra-fees": "추가비용 내역",
  "/mypage/tax": "세금계산서 내역",
  "/mypage/settings": "회원정보수정",
};

const TOP_LEVEL = new Set(["/sell", "/goods", "/customer", "/exhibition"]);

function resolveLabel(pathname: string): string {
  if (LABELS[pathname]) return LABELS[pathname];
  if (pathname.startsWith("/products/")) return "상품 상세정보";
  if (pathname.startsWith("/events/")) return "이벤트 상세";
  return "타이어존";
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const label = resolveLabel(pathname);
  const isTopLevel = TOP_LEVEL.has(pathname);

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted px-4 pt-3 lg:pt-4">
      <Link href="/main" className="hover:text-brand hover:underline underline-offset-2">
        HOME
      </Link>
      <ChevronRight size={14} />
      {isTopLevel ? (
        <span className="text-foreground font-medium">{label}</span>
      ) : (
        <>
          <Link href="/products" className="hover:text-brand hover:underline underline-offset-2">
            타이어 구매
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">{label}</span>
        </>
      )}
    </nav>
  );
}
