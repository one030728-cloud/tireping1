"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  "/main": "홈",
  "/events": "이벤트",
  "/factory-price": "공장도가 확인",
  "/products": "타이어 구매",
  "/wishlist": "찜한 판매업체",
  "/cart": "타이어 장바구니",
  "/orders": "주문내역",
  "/mypage/status": "주문 / 배송 현황",
  "/mypage/orders": "주문내역 / 배송조회",
  "/mypage/deposits": "입출금 내역",
  "/mypage/extra-fees": "추가비용 내역",
  "/mypage/tax": "세금계산서 내역",
};

function resolveLabel(pathname: string): string {
  if (LABELS[pathname]) return LABELS[pathname];
  if (pathname.startsWith("/products/")) return "상품 상세정보";
  if (pathname.startsWith("/events/")) return "이벤트 상세";
  return "타이어존";
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const label = resolveLabel(pathname);

  return (
    <nav className="hidden lg:flex items-center gap-1.5 text-xs text-muted px-4 pt-4">
      <Link href="/main" className="hover:text-brand hover:underline underline-offset-2">
        HOME
      </Link>
      <ChevronRight size={12} />
      <Link href="/products" className="hover:text-brand hover:underline underline-offset-2">
        타이어 구매
      </Link>
      <ChevronRight size={12} />
      <span className="text-foreground font-medium">{label}</span>
    </nav>
  );
}
