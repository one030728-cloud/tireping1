"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Clock, Search } from "lucide-react";
import Carousel from "@/components/Carousel";
import RequireAuth from "@/components/RequireAuth";
import TireCard from "@/components/TireCard";
import { EVENTS, MANUFACTURERS, NOTICES, TIRES } from "@/lib/mockData";
import { useOrders } from "@/lib/orders";

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
  const ongoingEvent = EVENTS.find((e) => e.status === "ongoing");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (manufacturer) params.set("manufacturer", manufacturer);
    if (size) params.set("size", size);
    router.push(`/products?${params.toString()}`);
  }

  const bannerImage = ongoingEvent && BANNER_IMAGES[ongoingEvent.id];

  const banner = ongoingEvent && (
    <Link
      href={`/events/${ongoingEvent.id}`}
      className="relative block rounded-2xl overflow-hidden h-32 md:h-44 lg:h-56 shadow-[var(--shadow-lg)] transition-transform hover:-translate-y-0.5"
    >
      {bannerImage ? (
        <Image
          src={bannerImage}
          alt={ongoingEvent.title}
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1024px) 700px, 100vw"
        />
      ) : (
        <div
          className="w-full h-full flex items-center px-6 text-left"
          style={{ background: ongoingEvent.bannerGradient }}
        >
          <div>
            <p className="text-xs font-bold text-black/60">진행중 이벤트</p>
            <p className="text-xl font-extrabold text-black/80 mt-1">{ongoingEvent.title}</p>
          </div>
        </div>
      )}
    </Link>
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
              <span className="text-brand text-xs font-semibold">{o.status}</span>
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

  const noticesBox = (
    <section className="pb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">공지사항</h2>
      </div>
      <div className="card divide-y divide-border">
        {NOTICES.map((n) => (
          <div
            key={n.id}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2"
          >
            <span>{n.title}</span>
            <span className="text-muted text-xs shrink-0 ml-3">{n.date}</span>
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
        {noticesBox}
      </div>

      {/* Desktop: main content + search/orders side panel */}
      <div className="hidden lg:flex gap-6 py-6">
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          {banner}
          <div className="grid grid-cols-2 gap-4">
            {eventGrid}
            {bestGrid}
          </div>
          {noticesBox}
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
