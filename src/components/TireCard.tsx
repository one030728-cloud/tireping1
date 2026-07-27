import Link from "next/link";
import type { Tire } from "@/lib/types";
import ImagePlaceholder from "./ImagePlaceholder";

export default function TireCard({
  tire,
  fixedWidth = true,
}: {
  tire: Tire;
  fixedWidth?: boolean;
}) {
  return (
    <Link
      href={`/products/${tire.id}`}
      className={`group card card-hover ${fixedWidth ? "min-w-[160px] w-40 shrink-0" : "w-full"} p-3 flex flex-col gap-1`}
    >
      <ImagePlaceholder
        className="w-full aspect-[4/3] mb-2 transition-transform duration-300 group-hover:scale-[1.04]"
        manufacturer={tire.manufacturer}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{tire.manufacturer}</span>
        {tire.tag && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
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
      <div className="mt-1 pt-1.5 border-t border-border/70 flex items-baseline gap-1 tabular-nums">
        <span className="text-brand font-bold text-sm">{tire.discountRate}%</span>
        <span className="font-extrabold">{tire.price.toLocaleString()}원</span>
      </div>
    </Link>
  );
}
