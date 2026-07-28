"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Factory, Home, PackageSearch, ShoppingCart, UserRound } from "lucide-react";
import { useCart } from "@/lib/cart";

const ITEMS = [
  { href: "/main", label: "홈", Icon: Home, paths: ["/main"] },
  { href: "/factory-price", label: "공장도가", Icon: Factory, paths: ["/factory-price"] },
  {
    href: "/products",
    label: "상품목록",
    Icon: PackageSearch,
    paths: ["/products", "/direct", "/events", "/exhibition"],
  },
  { href: "/cart", label: "장바구니", Icon: ShoppingCart, paths: ["/cart"] },
  {
    href: "/mypage/status",
    label: "마이",
    Icon: UserRound,
    paths: ["/mypage", "/orders", "/wishlist"],
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { items } = useCart();
  const cartCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav
      aria-label="모바일 주요 메뉴"
      className="fixed inset-x-3 bottom-2 z-40 grid h-[64px] grid-cols-5 overflow-hidden rounded-[22px] border border-white/80 bg-white/88 pb-[env(safe-area-inset-bottom)] shadow-[0_12px_36px_rgba(15,23,42,0.18)] backdrop-blur-2xl lg:hidden"
    >
      {ITEMS.map(({ href, label, Icon, paths }) => {
        const active = paths.some((path) =>
          path === "/main" || path === "/cart"
            ? pathname === path
            : pathname === path || pathname.startsWith(`${path}/`),
        );

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] transition-transform duration-200 active:scale-95 ${
              active ? "font-bold text-brand" : "text-[#727780]"
            }`}
          >
            {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand" />}
            <span
              className={`relative flex h-8 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                active ? "bg-blue-50 shadow-[0_4px_12px_rgba(37,99,235,0.14)]" : ""
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
              {href === "/cart" && cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold leading-none text-white shadow-sm">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
