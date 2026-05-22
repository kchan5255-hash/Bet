"use client";

import { SlidersHorizontal } from "lucide-react";
import type { RaceModelKey } from "@/lib/race-view-types";
import { cn } from "@/lib/utils";

interface ModelToggleProps {
  value: RaceModelKey;
  onChange: (value: RaceModelKey) => void;
  v19Available: boolean;
}

const OPTIONS: {
  value: RaceModelKey;
  label: string;
  hint: string;
}[] = [
  { value: "v19", label: "V19", hint: "最新模型 · 距離過濾" },
  { value: "pro", label: "Pro", hint: "基礎模型 · 14 特徵" },
  { value: "v9", label: "V9", hint: "百分位相對評分" },
];

export function ModelToggle({ value, onChange, v19Available }: ModelToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="模型版本"
      className="flex items-center gap-2"
    >
      <SlidersHorizontal
        className="h-3.5 w-3.5 shrink-0 text-text-muted"
        aria-hidden
      />
      <div className="flex flex-1 rounded-lg border border-border-subtle bg-bg-subtle p-0.5">
        {OPTIONS.map((option) => {
          const disabled = option.value === "v19" && !v19Available;
          const active = option.value === value && !disabled;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-pressed={active}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              onClick={() => !disabled && onChange(option.value)}
              title={
                disabled
                  ? "本期 V19 預測未到位"
                  : option.hint
              }
              className={cn(
                "h-8 flex-1 rounded-md px-2 text-xs font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-ai-start",
                active
                  ? "bg-bg-card text-text shadow-sm"
                  : "text-text-muted hover:text-text",
                disabled && "cursor-not-allowed opacity-40",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
