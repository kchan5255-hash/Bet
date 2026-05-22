"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  judged: boolean;
  hit: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({ judged, hit, size = "sm" }: StatusBadgeProps) {
  const cls = size === "md" ? "px-2.5 py-1 text-[12px]" : "px-2 py-0.5 text-[11px]";
  if (!judged) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-subtle font-semibold text-text-muted",
          cls,
        )}
      >
        <Clock className="h-3 w-3" aria-hidden />
        待定
      </span>
    );
  }
  if (hit) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-precision/30 bg-precision/10 font-semibold text-precision-glow",
          cls,
        )}
      >
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        命中
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-danger/30 bg-danger/10 font-semibold text-danger",
        cls,
      )}
    >
      <XCircle className="h-3 w-3" aria-hidden />
      未中
    </span>
  );
}
