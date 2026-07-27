"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, ChevronRight, LogOut, Megaphone, Menu, ShoppingCart, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { MYPAGE_LINKS, SIDEBAR_LINKS } from "@/lib/nav";
import { NOTICES } from "@/lib/mockData";

const GUEST_NAV_LINKS = [
  { href: "/factory-price", label: "공장도가 확인" },
  { href: "/main", label: "타이어 구매" },
  { href: "/events?tab=ongoing", label: "이벤트" },
];

export default function Header() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mypageOpen, setMypageOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const router = useRouter();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border">
      <div className="max-w-[1240px] mx-auto flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-6">
          <button
            aria-label="메뉴 열기"
            onClick={() => setMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 text-foreground/80 hover:text-brand"
          >
            <Menu size={22} />
          </button>

          <Link href={user ? "/main" : "/"} className="flex items-center">
            <Image
              src="/logo.svg"
              alt="타이어존"
              width={176}
              height={51}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {user ? (
            <nav className="hidden lg:flex items-center gap-2">
              <Link
                href="/main"
                className="px-4 h-9 flex items-center rounded-full bg-brand text-white text-sm font-semibold"
              >
                타이어 구매
              </Link>
            </nav>
          ) : (
            <nav className="hidden lg:flex items-center gap-5">
              {GUEST_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-foreground/70 hover:text-brand"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {user && NOTICES[0] && (
          <div className="hidden lg:flex items-center gap-1.5 flex-1 mx-6 overflow-hidden text-muted">
            <Megaphone size={14} className="shrink-0" />
            <div className="whitespace-nowrap text-xs animate-[ticker_18s_linear_infinite]">
              {NOTICES[0].title}
            </div>
          </div>
        )}

        {!user && (
          <div className="hidden lg:flex items-center gap-4 text-xs text-muted">
            <span>
              등록 업체수 <b className="text-foreground">4,612</b>
            </span>
            <span>
              누적 거래수량 <b className="text-foreground">716,642</b>
            </span>
          </div>
        )}

        <div className="flex items-center gap-4">
          {user && (
            <Link
              href="/cart"
              aria-label="장바구니"
              className="relative flex flex-col items-center justify-center text-foreground/70 hover:text-brand p-2.5 -m-2.5"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-accent text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {user && (
            <DropdownMenu.Root open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenu.Trigger asChild>
                <button
                  aria-label="알림"
                  className="relative flex flex-col items-center justify-center text-foreground/70 hover:text-brand p-2.5 -m-2.5"
                >
                  <Bell size={20} />
                  {NOTICES.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
                  )}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="w-72 rounded-lg border border-border bg-surface shadow-lg py-1.5 z-50 data-[state=open]:animate-[slide-in-from-top_180ms_ease-out] data-[state=closed]:animate-[slide-out-to-top_150ms_ease-in]"
                >
                  <p className="px-3 py-2 text-xs font-semibold text-muted border-b border-border">
                    공지사항
                  </p>
                  {NOTICES.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted text-center">새 알림이 없습니다.</p>
                  ) : (
                    NOTICES.map((n) => (
                      <DropdownMenu.Item
                        key={n.id}
                        className="px-3 py-2 hover:bg-background outline-none cursor-default"
                      >
                        <p className="text-xs text-foreground/90 leading-snug">{n.title}</p>
                        <p className="text-[10px] text-muted mt-0.5">{n.date}</p>
                      </DropdownMenu.Item>
                    ))
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}

          {user && (
            <DropdownMenu.Root open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <div
                className="hidden lg:block"
                onMouseEnter={() => setProfileMenuOpen(true)}
                onMouseLeave={() => setProfileMenuOpen(false)}
              >
                <DropdownMenu.Trigger asChild>
                  <Link
                    href="/mypage/status"
                    className="flex items-center gap-2 pl-3 border-l border-border hover:opacity-80"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">
                      {user.businessName.slice(0, 1)}
                    </div>
                    <div className="leading-tight text-left">
                      <p className="text-xs font-semibold">{user.businessName}</p>
                      <p className="text-[10px] text-muted">{user.ownerName} 사장님</p>
                    </div>
                  </Link>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="w-48 rounded-lg border border-border bg-surface shadow-lg py-1.5 z-50 data-[state=open]:animate-[slide-in-from-top_180ms_ease-out] data-[state=closed]:animate-[slide-out-to-top_150ms_ease-in]"
                  >
                    {MYPAGE_LINKS.map((link) => (
                      <DropdownMenu.Item key={link.href} asChild>
                        <Link
                          href={link.href}
                          className="block px-3 py-2 text-xs text-foreground/80 hover:bg-background hover:text-brand outline-none"
                        >
                          {link.label}
                        </Link>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </div>
            </DropdownMenu.Root>
          )}

          {user ? (
            <button
              aria-label="로그아웃"
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="p-2 text-foreground/70 hover:text-accent"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <div className="flex items-center gap-3 text-sm font-medium">
              <Link href="/login" className="text-foreground/70 hover:text-brand">
                로그인
              </Link>
              <Link href="/login" className="hidden sm:inline text-foreground/70 hover:text-brand">
                회원가입
              </Link>
            </div>
          )}
        </div>
      </div>

      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 lg:hidden data-[state=open]:animate-[overlay-show_200ms_ease-out] data-[state=closed]:animate-[overlay-hide_180ms_ease-in]" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 w-72 max-w-[85%] bg-surface shadow-xl p-5 flex flex-col gap-1 overflow-y-auto z-50 lg:hidden data-[state=open]:animate-[slide-in-from-left_250ms_ease-out] data-[state=closed]:animate-[slide-out-to-left_200ms_ease-in]"
          >
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="font-bold text-brand text-lg">메뉴</Dialog.Title>
              <Dialog.Close asChild>
                <button aria-label="닫기" className="p-1 text-muted hover:text-foreground">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>

            {user ? (
              <>
                <Link
                  href="/mypage/status"
                  onClick={() => setMenuOpen(false)}
                  className="mb-4 p-3 rounded-lg bg-background text-sm hover:bg-border/40"
                >
                  <p className="font-semibold">{user.businessName}</p>
                  <p className="text-muted">{user.ownerName} 사장님</p>
                </Link>

                <Link
                  href="/main"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-background"
                >
                  홈
                </Link>

                {SIDEBAR_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-background"
                  >
                    {link.label}
                  </Link>
                ))}

                <button
                  onClick={() => setMypageOpen((v) => !v)}
                  className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-background flex items-center justify-between"
                >
                  마이페이지
                  <ChevronRight
                    size={16}
                    className={`transition-transform ${mypageOpen ? "rotate-90" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    mypageOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pl-3 flex flex-col gap-1 border-l border-border ml-3">
                      {MYPAGE_LINKS.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          className="px-3 py-2.5 rounded-lg text-sm text-muted hover:bg-background hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {GUEST_NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-background"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 px-3 py-3 rounded-lg text-sm font-semibold bg-brand text-white text-center"
                >
                  로그인
                </Link>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
