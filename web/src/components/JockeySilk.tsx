"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface JockeySilkProps {
  no: string;
  code?: string;
  size?: number;
  className?: string;
}

export function JockeySilk({ no, code, size = 32, className }: JockeySilkProps) {
  const [error, setError] = useState(false);
  const firstChar = code ? code.charAt(0).toUpperCase() : "";
  const src = code
    ? `https://consvc.hkjc.com/-/media/General/Racing/Horse/${firstChar}/${code}/silk_${code}.png`
    : null;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-sm overflow-hidden flex-shrink-0 bg-bg-subtle",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src && !error ? (
        <img
          src={src}
          alt={`Silk ${no}`}
          width={size}
          height={size}
          className="h-full w-full object-contain"
          onError={() => setError(true)}
          loading="lazy"
        />
      ) : (
        <FallbackSilk no={no} size={size} />
      )}
    </div>
  );
}

const FALLBACK_COLORS = [
  "#DC2626",
  "#2563EB",
  "#059669",
  "#F59E0B",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#EA580C",
  "#16A34A",
  "#9333EA",
  "#BE123C",
  "#0F766E",
  "#4F46E5",
  "#C026D3",
];

function FallbackSilk({ no, size }: { no: string; size: number }) {
  const color = FALLBACK_COLORS[(Number(no) - 1) % FALLBACK_COLORS.length];
  return (
    <div
      className="flex items-center justify-center h-full w-full"
      style={{ background: color }}
    >
      <span
        className="number-mono font-black text-white drop-shadow"
        style={{ fontSize: size * 0.45 }}
      >
        {no}
      </span>
    </div>
  );
}
