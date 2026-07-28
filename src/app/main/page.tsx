"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronRight,
  CircleDot,
  Clock,
  Factory,
  Home,
  PackageSearch,
  Search,
  ShoppingCart,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import HeroCarousel from "@/components/HeroCarousel";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import RequireAuth from "@/components/RequireAuth";
import type { Tire } from "@/lib/types";
import {
  DIRECT_NOTICE,
  EVENTS,
  EVENT_BANNER_IMAGES,
  FAQ_CATEGORIES,
  MANUFACTURERS,
  NOTICES,
  TIRES,
  UPDATE_LOGS,
} from "@/lib/mockData";
import { useOrders } from "@/lib/orders";

function DashboardTireCard({ tire }: { tire: Tire }) {
  return (
    <Link
      href={`/products/${tire.id}`}
      className="w-[145px] shrink-0 flex flex-col rounded-xl text-[#333] transition-[transform,filter] duration-200 active:scale-[0.975] active:brightness-[0.98] hover:text-brand"
    >
      <ImagePlaceholder
        manufacturer={tire.manufacturer}
        className="h-[86px] w-[145px] mb-2.5 !rounded-[8px] !border-0 !bg-[#f6f6f6] p-3"
      />
      <span className="text-[13px] text-[#555] text-center mb-2">{tire.manufacturer}</span>
      <p className="h-[37px] text-[16px] font-semibold leading-[18px] line-clamp-2">{tire.model}</p>
      <p className="mt-2 text-[13px] leading-[15px] text-[#666]">
        {tire.width} / {tire.ratio} R {tire.rim}
        <br />
        DOT {tire.dot}
      </p>
      <div className="mt-2.5 pt-2 border-t border-[#e4e4e4] flex items-end gap-1.5 whitespace-nowrap">
        <strong className="text-[35px] leading-none tracking-[-0.06em] text-[#1748c7]">
          {tire.discountRate}
          <span className="text-[16px] ml-0.5">%</span>
        </strong>
        <div className="pb-0.5">
          {tire.tag && (
            <span className="block w-fit rounded-full border border-[#2780ff] px-1.5 text-[11px] leading-[16px] font-semibold text-[#1671f9]">
              {tire.tag}
            </span>
          )}
          <strong className="text-[17px] leading-[20px] text-[#444]">
            {tire.price.toLocaleString()}
            <span className="text-[12px] ml-0.5">원</span>
          </strong>
        </div>
      </div>
    </Link>
  );
}

function DesktopProductSection({
  title,
  href,
  tires,
  kind,
}: {
  title: string;
  href: string;
  tires: Tire[];
  kind: "event" | "best";
}) {
  const Icon = kind === "event" ? Bell : ThumbsUp;

  return (
    <section className="h-[330px] min-w-0 overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-white px-7 pt-5 shadow-[0_2px_7px_rgba(0,0,0,0.03)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[20px] font-medium">
          <Icon size={21} strokeWidth={1.6} />
          {title}
        </h2>
        <Link href={href} className="flex items-center text-[13px] text-[#555] hover:text-brand">
          전체보기 <ChevronRight size={14} />
        </Link>
      </div>
      <div
        className={`flex gap-11 overflow-visible pl-6 ${
          kind === "best" ? "-translate-x-[129px]" : ""
        }`}
      >
        {tires.map((tire) => (
          <DashboardTireCard key={tire.id} tire={tire} />
        ))}
      </div>
    </section>
  );
}

function MobileProductSection({
  title,
  href,
  tires,
  kind,
}: {
  title: string;
  href: string;
  tires: Tire[];
  kind: "event" | "best";
}) {
  const Icon = kind === "event" ? Bell : ThumbsUp;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center justify-between px-4">
        <h2 className="flex items-center gap-2 text-[17px] font-bold">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              kind === "event" ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-brand"
            }`}
          >
            <Icon size={17} strokeWidth={1.8} />
          </span>
          {title}
        </h2>
        <Link href={href} className="flex items-center text-xs text-[#777]">
          전체보기 <ChevronRight size={14} />
        </Link>
      </div>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {tires.map((tire) => (
          <div key={tire.id} className="snap-start">
            <DashboardTireCard tire={tire} />
          </div>
        ))}
      </div>
    </section>
  );
}

function MobileBottomNav() {
  const items = [
    { href: "/main", label: "홈", Icon: Home, active: true },
    { href: "/factory-price", label: "공장도가", Icon: Factory },
    { href: "/products", label: "상품목록", Icon: PackageSearch },
    { href: "/cart", label: "장바구니", Icon: ShoppingCart },
    { href: "/mypage/status", label: "마이", Icon: UserRound },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[66px] grid-cols-5 border-t border-white/70 bg-white/85 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl lg:hidden">
      {items.map(({ href, label, Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] transition-transform duration-200 active:scale-95 ${
            active ? "font-bold text-brand" : "text-[#727780]"
          }`}
        >
          {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand" />}
          <span
            className={`flex h-8 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
              active ? "bg-blue-50 shadow-[0_4px_12px_rgba(37,99,235,0.14)]" : ""
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}

function MainContent() {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState("");
  const [size, setSize] = useState("");
  const mobileFeedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const feed = mobileFeedRef.current;
    if (!feed) return;

    const elements = Array.from(feed.querySelectorAll<HTMLElement>(".mobile-reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px" },
    );

    elements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index * 45, 180)}ms`;
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const { orders } = useOrders();
  const eventTires = TIRES.filter((t) => t.tag === "EVENT");
  const bestTires = TIRES.filter((t) => t.tag === "BEST");
  const desktopEventTires: Tire[] = [
    {
      ...eventTires[0],
      width: 235,
      ratio: 40,
      rim: 19,
      dot: "2025",
      discountRate: 55,
      price: 204900,
    },
    {
      ...eventTires[5],
      width: 245,
      ratio: 45,
      rim: 19,
      dot: "2026",
      discountRate: 55,
      price: 142500,
    },
    {
      ...eventTires[2],
      width: 175,
      ratio: 50,
      rim: 15,
      dot: "2025",
      discountRate: 55,
      price: 66800,
    },
    {
      ...eventTires[3],
      width: 175,
      ratio: 65,
      rim: 15,
      dot: "2025",
      discountRate: 55,
      price: 63800,
    },
    ...eventTires.slice(4, 5),
  ];
  const desktopBestTires: Tire[] = [
    bestTires[0],
    { ...bestTires[4], discountRate: 47, price: 38980 },
    { ...bestTires[3], width: 255, ratio: 45, rim: 20, discountRate: 60, price: 169980 },
    { ...bestTires[5], width: 245, ratio: 40, rim: 19, discountRate: 42, price: 215600 },
    { ...bestTires[2], discountRate: 37 },
    ...bestTires.slice(6),
  ];
  const recentOrders = orders.slice(0, 4);
  const ongoingEvents = EVENTS.filter((e) => e.status === "ongoing").sort((a, b) =>
    a.id === "e2" ? -1 : b.id === "e2" ? 1 : 0,
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (manufacturer) params.set("manufacturer", manufacturer);
    if (size) params.set("size", size);
    router.push(`/products?${params.toString()}`);
  }

  const banner = (
    <HeroCarousel
      className="shadow-[var(--shadow-lg)]"
      autoPlayInterval={4000}
      showControls={false}
      slides={ongoingEvents.map((ev) => {
        const bannerImage = EVENT_BANNER_IMAGES[ev.id];
        return {
          key: ev.id,
          content: (
            <Link href={`/events/${ev.id}`} className="relative block w-full h-full">
              {bannerImage ? (
                <>
                  <Image
                    src={bannerImage}
                    alt={ev.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="(min-width: 1024px) 700px, 100vw"
                  />
                  {ev.id === "e2" && (
                    <div className="absolute top-[40px] left-1/2 hidden h-[70px] w-[780px] -translate-x-1/2 items-center justify-center bg-[#efb5e5]/95 text-[47px] font-light italic tracking-[-0.02em] text-black lg:flex">
                      * TIREPING GRAND EVENT *
                    </div>
                  )}
                  {ev.id !== "e2" && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
                      <div className="absolute inset-0 flex items-end px-6 pb-6 text-left">
                        <div>
                          <p className="text-xs font-bold text-white/80">진행중 이벤트</p>
                          <p className="text-xl font-extrabold text-white mt-1">{ev.title}</p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div
                  className="w-full h-full flex items-center px-6 text-left"
                  style={{ background: ev.bannerGradient }}
                >
                  <div>
                    <p className="text-xs font-bold text-black/60">진행중 이벤트</p>
                    <p className="text-xl font-extrabold text-black/80 mt-1">{ev.title}</p>
                  </div>
                </div>
              )}
            </Link>
          ),
        };
      })}
    />
  );

  const directBanner = (
    <Link href="/direct" className="card p-5 text-center block card-hover">
      <p className="text-sm text-muted mb-1">{DIRECT_NOTICE}</p>
      <h2 className="text-base font-extrabold">
        타이어 <span className="text-brand">당일 직배송</span> 주문으로~!
      </h2>
    </Link>
  );

  const noticesBox = (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">공지사항</h2>
        <Link href="/customer?tab=notice" className="text-xs text-muted flex items-center">
          전체보기 <ChevronRight size={14} />
        </Link>
      </div>
      <div className="card divide-y divide-border">
        {NOTICES.slice(0, 4).map((n) => (
          <div
            key={n.id}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2"
          >
            <span className="truncate">{n.title}</span>
            <span className="text-muted text-xs shrink-0 ml-3">{n.date}</span>
          </div>
        ))}
      </div>
    </section>
  );

  const faqBox = (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">자주묻는 질문</h2>
        <Link href="/customer?tab=faq" className="text-xs text-muted flex items-center">
          전체보기 <ChevronRight size={14} />
        </Link>
      </div>
      <div className="card grid grid-cols-3 gap-1 p-3">
        {FAQ_CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href="/customer?tab=faq"
            className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-surface-2 text-center"
          >
            <span className="text-xs font-medium">{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );

  const updateBox = (
    <section className="pb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">업데이트 내역</h2>
        <Link href="/customer?tab=update" className="text-xs text-muted flex items-center">
          전체보기 <ChevronRight size={14} />
        </Link>
      </div>
      <div className="card divide-y divide-border">
        {UPDATE_LOGS.slice(0, 4).map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2"
          >
            <span className="truncate">{u.title}</span>
            <span className="text-muted text-xs shrink-0 ml-3">{u.date}</span>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <>
      {/* Mobile / tablet: single stacked column */}
      <div ref={mobileFeedRef} className="flex flex-col gap-5 px-4 pt-4 pb-24 lg:hidden">
        <div className="mobile-reveal [&>div]:h-[170px] [&>div]:rounded-2xl [&>div]:shadow-[0_10px_30px_rgba(225,29,72,0.16)]">
          {banner}
        </div>

        <section className="mobile-reveal rounded-2xl border border-white/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <h2 className="mb-3 flex items-center gap-2 text-[17px] font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-brand">
              <CircleDot size={17} />
            </span>
            타이어 검색
          </h2>
          <form onSubmit={handleSearch}>
            <div className="mb-3 flex h-11 overflow-hidden rounded-xl border border-[#d9dee7] bg-white">
              <select
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                aria-label="제조사"
                className="w-[108px] shrink-0 border-0 border-r border-[#d9dee7] px-3 text-sm focus:outline-none"
              >
                <option value="">제조사</option>
                {MANUFACTURERS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                aria-label="타이어 사이즈"
                placeholder="사이즈 245 45 18"
                className="min-w-0 flex-1 border-0 px-3 text-sm focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-primary h-11 w-full rounded-xl text-[15px]">
              <Search size={17} className="mr-1.5" /> 검색하기
            </button>
          </form>
        </section>

        <section className="mobile-reveal overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-[#edf0f4] px-4 py-3.5">
            <h2 className="flex items-center gap-2 text-[16px] font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-brand">
                <Clock size={17} />
              </span>
              최근 주문 내역
            </h2>
            <Link href="/orders" className="flex items-center text-xs text-[#777]">
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-[#edf0f4]">
            {recentOrders.map((order, index) => (
              <Link
                key={order.id}
                href="/orders"
                className="grid min-h-[48px] grid-cols-[56px_1fr_auto] items-center gap-2 px-4 text-[13px] active:bg-[#f7f9fc]"
              >
                <span className="text-[#777]">{order.id}</span>
                <span className="truncate font-semibold text-[#075bea]">{order.model}</span>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    index === 1
                      ? "bg-slate-100 text-slate-500"
                      : index === 2
                        ? "bg-rose-50 text-rose-500"
                        : "bg-emerald-50 text-emerald-500"
                  }`}
                >
                  {order.status}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mobile-reveal">
          <MobileProductSection
          title="이벤트 진행 중 타이어"
          href="/products?tag=EVENT"
          tires={desktopEventTires}
            kind="event"
          />
        </div>
        <div className="mobile-reveal">
          <MobileProductSection
          title="판매 인기 타이어"
          href="/products"
          tires={desktopBestTires}
            kind="best"
          />
        </div>

        <div className="mobile-reveal [&_.card]:rounded-2xl">{directBanner}</div>
        <div className="mobile-reveal flex flex-col gap-5">
          {noticesBox}
          {faqBox}
          {updateBox}
        </div>
      </div>
      <MobileBottomNav />

      {/* Desktop: tireping-style full-width dashboard */}
      <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_392px] gap-x-[26px] gap-y-[30px] pl-[50px] pr-[20px] pt-[35px] pb-10">
        <div className="[&>div]:h-[388px] [&>div]:rounded-[16px] [&>div]:shadow-none">{banner}</div>

        <aside className="flex flex-col gap-[18px]">
          <section className="h-[170px] rounded-[16px] border border-[#e5e7eb] bg-white p-7 shadow-[0_2px_7px_rgba(0,0,0,0.03)]">
            <h2 className="mb-4 flex items-center gap-1.5 text-[20px] font-medium">
              <CircleDot size={19} className="text-[#334155]" />
              타이어 검색
            </h2>
            <form onSubmit={handleSearch}>
              <div className="mb-3 flex h-[38px] overflow-hidden rounded-[6px] border border-[#d9dee7]">
                <select
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-[153px] border-0 border-r border-[#d9dee7] px-3 text-[14px] focus:outline-none"
                >
                  <option value="">제조사</option>
                  {MANUFACTURERS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="사이즈 검색 245 45 18"
                  className="min-w-0 flex-1 border-0 px-3 text-[14px] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="btn-primary h-[35px] w-full rounded-[5px] text-[15px]"
              >
                <Search size={17} className="mr-1" /> 검색하기
              </button>
            </form>
          </section>

          <section className="h-[202px] overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-white px-7 pt-5 shadow-[0_2px_7px_rgba(0,0,0,0.03)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[18px] font-medium">
                <Clock size={18} strokeWidth={1.8} />
                최근 주문 내역
              </h2>
              <Link href="/orders" className="flex items-center text-[13px] text-[#555]">
                전체보기 <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-1.5">
              {recentOrders.map((order, index) => (
                <div
                  key={order.id}
                  className="grid grid-cols-[52px_1fr_auto] items-center gap-2 text-[13px] leading-6"
                >
                  <span className="text-[#555]">{order.id}</span>
                  <span className="truncate font-medium text-[#075bea]">{order.model}</span>
                  <span
                    className={`text-[12px] font-medium ${
                      index === 1
                        ? "text-[#1671f9]"
                        : index === 2
                          ? "text-[#ff4c34]"
                          : "text-[#ff7a21]"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <div className="col-span-2 grid min-w-0 grid-cols-2 gap-6">
          <DesktopProductSection
            title="이벤트 진행 중 타이어"
            href="/products?tag=EVENT"
            tires={desktopEventTires}
            kind="event"
          />
          <DesktopProductSection
            title="판매 인기 타이어"
            href="/products"
            tires={desktopBestTires}
            kind="best"
          />
        </div>

        <div className="col-span-2 mt-[-2px]">
          {directBanner}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {noticesBox}
            {faqBox}
            {updateBox}
          </div>
        </div>

        <Link
          href="/customer?tab=qna"
          aria-label="채팅문의"
          className="fixed bottom-3 right-3 z-30 flex h-16 w-16 flex-col items-center justify-center rounded-full border-4 border-[#ffe600] bg-[#3c1e1e] text-[11px] font-extrabold leading-tight text-[#ffe600] shadow-lg"
        >
          TALK
          <span>채팅문의</span>
        </Link>
      </div>
    </>
  );
}

export default function MainPage() {
  return (
    <RequireAuth>
      <MainContent />
    </RequireAuth>
  );
}
