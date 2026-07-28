"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Clock, Search } from "lucide-react";
import Carousel from "@/components/Carousel";
import HeroCarousel from "@/components/HeroCarousel";
import RequireAuth from "@/components/RequireAuth";
import TireCard from "@/components/TireCard";
import { DIRECT_NOTICE, EVENTS, FAQ_CATEGORIES, MANUFACTURERS, NOTICES, TIRES, UPDATE_LOGS } from "@/lib/mockData";
import { useOrders } from "@/lib/orders";
import { getStatusStyle } from "@/lib/status";

const BANNER_IMAGES: Partial<Record<string, string>> = {
  e1: "/banners/rainy-season-ad.jpg",
};

function MainContent() {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState("");
  const [size, setSize] = useState("");

  const { orders } = useOrders();
  const eventTires = TIRES.filter((t) => t.tag === "EVENT");
  const bestTires = TIRES.filter((t) => t.tag === "BEST");
  const recentOrders = orders.slice(0, 3);
  const ongoingEvents = EVENTS.filter((e) => e.status === "ongoing");

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
      slides={ongoingEvents.map((ev) => {
        const bannerImage = BANNER_IMAGES[ev.id];
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
                  <div className="absolute inset-0 flex items-end px-6 pb-6 text-left">
                    <div>
                      <p className="text-xs font-bold text-white/80">진행중 이벤트</p>
                      <p className="text-xl font-extrabold text-white mt-1">{ev.title}</p>
                    </div>
                  </div>
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
        <Link href="/products" className="text-xs text-muted flex items-center">
          전체보기 <ChevronRight size={14} />
        </Link>
      </div>
      <Carousel autoPlayInterval={3000}>
        {eventTires.map((t) => (
          <TireCard key={t.id} tire={t} />
        ))}
      </Carousel>
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
      <Carousel autoPlayInterval={3000}>
        {bestTires.map((t) => (
          <TireCard key={t.id} tire={t} />
        ))}
      </Carousel>
    </section>
  );

  const directBanner = (
    <Link
      href="/direct"
      className="card p-5 text-center block card-hover"
    >
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

      {/* Desktop: main content + search/orders side panel */}
      <div className="hidden lg:flex gap-6 py-6">
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          {banner}
          <div className="grid grid-cols-2 gap-4">
            {eventGrid}
            {bestGrid}
          </div>
          {directBanner}
          <div className="grid grid-cols-3 gap-4">
            {noticesBox}
            {faqBox}
            {updateBox}
          </div>
        </div>
        <aside className="w-80 shrink-0 flex flex-col gap-8 sticky top-20 self-start">
          {searchBox}
          {ordersBox}
        </aside>
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
