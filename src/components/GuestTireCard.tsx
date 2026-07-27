import { Lock } from "lucide-react";
import type { Tire } from "@/lib/types";
import ImagePlaceholder from "./ImagePlaceholder";

export default function GuestTireCard({ tire }: { tire: Tire }) {
  return (
    <div className="min-w-[160px] w-40 shrink-0 bg-surface border border-border rounded-xl p-3 flex flex-col gap-1 transition-shadow hover:shadow-lg hover:-translate-y-1">
      <ImagePlaceholder className="w-full h-16 mb-1" manufacturer={tire.manufacturer} />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{tire.manufacturer}</span>
        {tire.tag && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              tire.tag === "EVENT"
                ? "bg-accent/10 text-accent animate-pulse"
                : "bg-brand/10 text-brand"
            }`}
          >
            {tire.tag}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold leading-snug line-clamp-2 h-10">{tire.model}</p>
      <p className="text-xs text-muted">
        {tire.width} / {tire.ratio} R {tire.rim} · DOT {tire.dot}
      </p>
      <div className="mt-1 flex items-center gap-1 text-muted text-xs">
        <Lock size={12} />
        판매가 로그인 후 확인
      </div>
    </div>
  );
}
