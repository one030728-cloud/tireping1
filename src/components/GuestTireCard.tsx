import Link from "next/link";
import { Lock } from "lucide-react";
import type { Tire } from "@/lib/types";
import ImagePlaceholder from "./ImagePlaceholder";

export default function GuestTireCard({ tire }: { tire: Tire }) {
  return (
    <Link
      href="/login"
      className="group card card-hover min-w-[160px] w-40 shrink-0 p-3 flex flex-col gap-1"
    >
      <ImagePlaceholder
        className="w-full aspect-[4/3] mb-2 transition-transform duration-300 group-hover:scale-[1.04]"
        manufacturer={tire.manufacturer}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{tire.manufacturer}</span>
        {tire.tag && (
          <span
            className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
              tire.tag === "EVENT" ? "bg-accent/10 text-accent" : "bg-brand/10 text-brand"
            }`}
          >
            {tire.tag}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold leading-snug line-clamp-2">{tire.model}</p>
      <p className="text-xs text-muted">
        {tire.width} / {tire.ratio} R {tire.rim} · DOT {tire.dot}
      </p>
      <div className="mt-auto pt-1.5 border-t border-border/70 flex items-center gap-1 text-muted text-xs">
        <Lock size={12} />
        판매가 로그인 후 확인
      </div>
    </Link>
  );
}
