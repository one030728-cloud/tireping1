"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronRight, CircleDot, Clock, Search, ThumbsUp } from "lucide-react";
import HeroCarousel from "@/components/HeroCarousel";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import RequireAuth from "@/components/RequireAuth";
import TireCard from "@/components/TireCard";
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
import { getStatusStyle } from "@/lib/status";

function DashboardTireCard({ tire }: { tire: Tire }) {
  return (
    <Link
      href={`/products/${tire.id}`}
      className="w-[145px] shrink-0 flex flex-col text-[#333] hover:text-brand"
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

function MainContent() {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState("");
  const [size, setSize] = useState("");

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

  const searchBox = (
    <section>
      <h2 className="font-bold mb-3 flex items-center gap-1.5">
        <Search size={16} className="text-brand" /> 타이어 검색
      </h2>
      <form onSubmit={handleSearch} className="card p-4 flex flex-col gap-3">
        <select
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          className="h-11 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
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
          className="h-11 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
        <button type="submit" className="btn-primary h-11">
          검색하기
        </button>
      </form>
    </section>
  );

  const ordersBox = (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold flex items-center gap-1.5">
          <Clock size={16} className="text-brand" /> 최근 주문 내역
        </h2>
        <Link href="/orders" className="text-xs text-muted flex items-center">
          전체보기 <ChevronRight size={14} />
        </Link>
      </div>
      <div className="card divide-y divide-border">
        {recentOrders.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted text-center">최근 주문 내역이 없습니다.</p>
        ) : (
          recentOrders.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted">{o.id}</span>
                <span className="font-medium">{o.model}</span>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusStyle(o.status)}`}
              >
                {o.status}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );

  const eventGrid = (
    <section className="lg:card lg:p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-accent-light to-accent" />
          이벤트 진행 중 타이어
        </h2>
        <Link href="/products?tag=EVENT" className="text-xs text-muted flex items-center">
          전체보기 <ChevronRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
        {eventTires.map((t) => (
          <TireCard key={t.id} tire={t} fixedWidth={false} />
        ))}
      </div>
    </section>
  );

  const bestGrid = (
    <section className="lg:card lg:p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-brand-light to-brand" />
          판매 인기 타이어
        </h2>
        <Link href="/products" className="text-xs text-muted flex items-center">
          전체보기 <ChevronRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
        {bestTires.map((t) => (
          <TireCard key={t.id} tire={t} fixedWidth={false} />
        ))}
      </div>
    </section>
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
      <div className="lg:hidden px-4 py-5 flex flex-col gap-8">
        {banner}
        {searchBox}
        {ordersBox}
        {eventGrid}
        {bestGrid}
        {directBanner}
        {noticesBox}
        {faqBox}
        {updateBox}
      </div>

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
