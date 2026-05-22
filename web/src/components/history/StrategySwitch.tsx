"use client";

import { Cpu } from "lucide-react";
import type { BetMode } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";

interface StrategySwitchProps {
  value: BetMode;
  onChange: (mode: BetMode) => void;
  className?: string;
}

const OPTIONS: { value: BetMode; label: string; hint: string }[] = [
  { value: "cross", label: "全串", hint: "Cross" },
  { value: "banker", label: "膽拖", hint: "Banker" },
];

export function StrategySwitch({ value, onChange, className }: StrategySwitchProps) {
  return (
    <div
      role="tablist"
      aria-label="投注策略切換"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-subtle/80 p-1",
        className,
      )}
    >
      <Cpu className="ml-2 mr-0.5 h-3.5 w-3.5 text-upset-glow" aria-hidden />
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
              "relative min-h-[36px] rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-start/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card",
              active
                ? "bg-gradient-to-r from-ai-start to-ai-end text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                : "text-text-muted hover:text-text",
            )}
          >
            <span>{opt.label}</span>
            <span className="ml-1 text-[10px] font-normal tracking-wider opacity-70">
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
