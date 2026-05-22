"use client";

import { Inbox, FilterX, Hourglass } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "no-data" | "no-judged" | "no-filter-result";

interface EmptyStateProps {
  variant: Variant;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

const VARIANTS: Record<
  Variant,
  { icon: LucideIcon; title: string; hint: string }
> = {
  "no-data": {
    icon: Inbox,
    title: "尚未有賽事資料",
    hint: "新賽季上線或 V19 模型未生成預測時會顯示此處。",
  },
  "no-judged": {
    icon: Hourglass,
    title: "賽果尚未公佈",
    hint: "馬會公佈賽果後將自動更新命中狀態與盈虧。",
  },
  "no-filter-result": {
    icon: FilterX,
    title: "目前篩選條件下沒有賽事",
    hint: "嘗試清除部分條件或選擇其他月份。",
  },
};

export function EmptyState({
  variant,
  onAction,
  actionLabel,
  className,
}: EmptyStateProps) {
  const { icon: Icon, title, hint } = VARIANTS[variant];
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border border-dashed border-border-subtle bg-bg-card/50 p-8 text-center",
        className,
      )}
    >
      <Icon
        className="mx-auto mb-3 h-7 w-7 text-text-subtle"
        aria-hidden
      />
      <p className="text-[13px] font-semibold text-text">{title}</p>
      <p className="mt-1 text-[11px] text-text-subtle">{hint}</p>
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "mt-4 inline-flex min-h-[36px] items-center gap-1 rounded-full border border-ai-start/30 bg-ai-start/10 px-3 py-1 text-[12px] font-semibold text-text transition-colors hover:bg-ai-start/15",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-start/70",
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
