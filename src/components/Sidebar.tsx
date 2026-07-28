"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  ChevronRight,
  CircleDot,
  Heart,
  ShoppingCart,
  Star,
  Truck,
  UserRound,
} from "lucide-react";
import { MYPAGE_LINKS, SIDEBAR_LINKS } from "@/lib/nav";

const SIDEBAR_ICONS = [Bell, Star, CircleDot, Truck, Bell, Heart, ShoppingCart];

export default function Sidebar() {
  const pathname = usePathname();
  const [mypageOpen, setMypageOpen] = useState(true);

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-border sticky top-[71px] self-start h-[calc(100vh-71px)] overflow-y-auto">
      <div className="flex flex-col py-4">
        {SIDEBAR_LINKS.map((link, index) => {
          const active =
            pathname === "/main"
              ? link.href === "/factory-price"
              : pathname === link.href.split("?")[0];
          const Icon = SIDEBAR_ICONS[index];
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex items-center gap-2.5 px-5 h-[46px] text-[15px] font-medium border-b border-border/70 ${
                active
                  ? "bg-[#eaf3ff] text-[#1671f9]"
                  : "text-[#252525] hover:bg-[#f7f9fc] hover:text-brand"
              }`}
            >
              <Icon size={19} strokeWidth={1.8} className={active ? "fill-current" : ""} />
              {link.label}
            </Link>
          );
        })}

        <button
          onClick={() => setMypageOpen((v) => !v)}
          aria-expanded={mypageOpen}
          className="px-5 h-[48px] text-[15px] font-semibold text-foreground flex items-center justify-between hover:text-brand border-b border-border/70"
        >
          <span className="flex items-center gap-2.5">
            <UserRound size={19} strokeWidth={1.8} />
            마이페이지
          </span>
          <ChevronRight
            size={15}
            className={`transition-transform ${mypageOpen ? "rotate-90" : ""}`}
          />
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            mypageOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="ml-[27px] border-l border-[#cfd4dc] py-1">
              {MYPAGE_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative block px-5 py-2 text-[13px] ${
                      active ? "text-brand font-semibold" : "text-[#666] hover:text-brand"
                    }`}
                  >
                    <span className="absolute left-0 top-1/2 w-2.5 border-t border-[#cfd4dc]" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/events?tab=ongoing"
        className="relative mt-auto mx-5 mb-2 block h-[110px] overflow-hidden"
      >
        <Image
          src="/banners/tireping-grand-event.png"
          alt="진행중 이벤트"
          fill
          sizes="200px"
          className="object-cover"
        />
      </Link>
    </aside>
  );
}
