import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { Manufacturer } from "@/lib/types";

const BRAND_LOGOS: Partial<Record<Manufacturer, string>> = {
  콘티넨탈: "/brands/continental.png",
  한국: "/brands/hankook.png",
  금호: "/brands/kumho.png",
  미쉐린: "/brands/michelin.png",
  넥센: "/brands/nexen.png",
};

export default function ImagePlaceholder({
  className = "",
  manufacturer,
}: {
  className?: string;
  manufacturer?: Manufacturer;
}) {
  const logo = manufacturer ? BRAND_LOGOS[manufacturer] : undefined;

  if (logo) {
    return (
      <div
        className={`flex items-center justify-center bg-white border border-border rounded-lg p-2 ${className}`}
      >
        <div className="relative w-full h-full">
          <Image src={logo} alt={manufacturer!} fill className="object-contain" sizes="200px" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-background border border-dashed border-border text-muted rounded-lg ${className}`}
    >
      <ImageOff size={22} strokeWidth={1.6} />
    </div>
  );
}
