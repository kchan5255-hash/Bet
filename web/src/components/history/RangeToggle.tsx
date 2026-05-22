"use client";

import { cn } from "@/lib/utils";

export type EquityRange = "all" | "30d" | "7d";

interface RangeToggleProps {
  value: EquityRange;
  onChange: (range: EquityRange) => void;
  className?: string;
}

const OPTIONS: { value: EquityRange; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "30d", label: "30 日" },
  { value: "7d", label: "7 日" },
];

export function RangeToggle({ value, onChange, className }: RangeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="時間範圍切換"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border-subtle bg-bg-subtle/80 p-0.5",
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "min-h-[32px] rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-start/70",
              active
                ? "bg-bg-elevated text-text shadow-sm"
                : "text-text-muted hover:text-text",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
