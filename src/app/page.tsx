"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { EVENTS, EVENT_BANNER_IMAGES, TIRES } from "@/lib/mockData";
import GuestTireCard from "@/components/GuestTireCard";
import HeroCarousel from "@/components/HeroCarousel";
import LoadingState from "@/components/LoadingState";

function GuestHome() {
  const eventTires = TIRES.filter((t) => t.tag === "EVENT");
  const bestTires = TIRES.filter((t) => t.tag === "BEST");
  const ongoingEvents = EVENTS.filter((e) => e.status === "ongoing");

  return (
    <div className="px-4 py-5 flex flex-col gap-8">
      <HeroCarousel
        className="shadow-[var(--shadow-lg)] animate-[fade-slide-up_400ms_ease-out_both]"
        autoPlayInterval={4000}
        slides={ongoingEvents.map((ev) => {
          const bannerImage = EVENT_BANNER_IMAGES[ev.id];
          return {
            key: ev.id,
            content: bannerImage ? (
              <div className="relative w-full h-full">
                <Image src={bannerImage} alt={ev.title} fill priority className="object-cover" sizes="100vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-start justify-end px-6 pb-5 text-left gap-3">
                  <div>
                    <p className="text-xs font-bold text-white/80">진행중 이벤트</p>
                    <p className="text-xl font-extrabold text-white mt-1">{ev.title}</p>
                  </div>
                  <Link
                    href="/login"
                    className="text-xs font-semibold bg-white text-zinc-900 px-3 py-1.5 rounded-full hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                  >
                    로그인하고 가격 확인하기
                  </Link>
                </div>
              </div>
            ) : (
              <div
                className="w-full h-full flex flex-col items-start justify-center px-6 text-left gap-3"
                style={{ background: ev.bannerGradient }}
              >
                <div>
                  <p className="text-xs font-bold text-black/60">진행중 이벤트</p>
                  <p className="text-xl font-extrabold text-black/80 mt-1">{ev.title}</p>
                </div>
                <Link
                  href="/login"
                  className="text-xs font-semibold bg-black/80 text-white px-3 py-1.5 rounded-full hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                >
                  로그인하고 가격 확인하기
                </Link>
              </div>
            ),
          };
        })}
      />

      <div className="flex flex-col gap-8 md:grid md:grid-cols-2 md:gap-4 md:items-start">
        <section className="lg:card lg:p-4">
          <div
            className="flex items-center justify-between mb-3 animate-[fade-slide-up_400ms_ease-out_both]"
            style={{ animationDelay: "60ms" }}
          >
            <h2 className="font-bold flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-accent-light to-accent" />
              이벤트 진행 중 타이어
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            {eventTires.map((t) => (
              <GuestTireCard key={t.id} tire={t} fixedWidth={false} />
            ))}
          </div>
        </section>

        <section className="lg:card lg:p-4">
          <div
            className="flex items-center justify-between mb-3 animate-[fade-slide-up_400ms_ease-out_both]"
            style={{ animationDelay: "100ms" }}
          >
            <h2 className="font-bold flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-brand-light to-brand" />
              판매 인기 타이어
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            {bestTires.map((t) => (
              <GuestTireCard key={t.id} tire={t} fixedWidth={false} />
            ))}
          </div>
        </section>
      </div>

      <div
        className="card rounded-2xl p-8 max-w-xl mx-auto w-full text-center flex flex-col items-center gap-3 relative overflow-hidden animate-[fade-slide-up_400ms_ease-out_both]"
        style={{ animationDelay: "300ms" }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand/5 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-accent/5 blur-2xl" />
        <p className="font-bold text-lg relative">사업자 로그인 후 실시간 판매가를 확인하세요</p>
        <p className="text-sm text-muted relative">
          타이어존은 사업자 전용 B2B 타이어 거래 플랫폼입니다.
        </p>
        <Link href="/login" className="btn-primary relative h-11 px-6">
          로그인 / 회원가입
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/main");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return <LoadingState />;
  }

  return <GuestHome />;
}
