"use client";

import { useState } from "react";
import { ChevronDown, FilterX } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterChip } from "./FilterChip";
import type { HistoryFilterState } from "./useHistoryFilter";

interface FilterBarProps {
  filter: HistoryFilterState;
  onChange: (patch: Partial<HistoryFilterState>) => void;
  onReset: () => void;
  isFiltered: boolean;
  monthOptions: string[];
  totalMeetings: number;
  shownMeetings: number;
}

const VENUES: { value: "all" | "ST" | "HV"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "ST", label: "沙田" },
  { value: "HV", label: "跑馬地" },
];

const HITS: { value: "all" | "hit" | "miss" | "pending"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "hit", label: "命中" },
  { value: "miss", label: "未中" },
  { value: "pending", label: "待定" },
];

const TIERS: { value: "all" | "S" | "A" | "B" | "none"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "S", label: "S" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "none", label: "未分級" },
];

export function FilterBar({
  filter,
  onChange,
  onReset,
  isFiltered,
  monthOptions,
  totalMeetings,
  shownMeetings,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      aria-label="賽事篩選"
      className="sticky top-2 z-30 rounded-2xl border border-border-subtle bg-bg/85 p-3 backdrop-blur-md md:top-4 md:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
          場地
        </span>
        {VENUES.map((v) => (
          <FilterChip
            key={v.value}
            pressed={filter.venue === v.value}
            onClick={() => onChange({ venue: v.value })}
            label={v.label}
          />
        ))}

        <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-text-subtle">
          狀態
        </span>
        {HITS.map((h) => (
          <FilterChip
            key={h.value}
            pressed={filter.hit === h.value}
            onClick={() => onChange({ hit: h.value })}
            label={h.label}
          />
        ))}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={cn(
            "ml-auto inline-flex min-h-[36px] items-center gap-1 rounded-full border border-border-subtle bg-bg-subtle/60 px-3 py-1 text-[11px] font-medium text-text-muted transition-colors hover:text-text",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-start/70",
          )}
        >
          進階
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        </button>

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className={cn(
              "inline-flex min-h-[36px] items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-[11px] font-semibold text-danger transition-colors hover:bg-danger/15",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/60",
            )}
          >
            <FilterX className="h-3.5 w-3.5" aria-hidden />
            清除
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border-subtle pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
              Tier
            </span>
            {TIERS.map((t) => (
              <FilterChip
                key={t.value}
                pressed={filter.tier === t.value}
                onClick={() => onChange({ tier: t.value })}
                label={t.label}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
              月份
            </span>
            <FilterChip
              pressed={filter.month === "all"}
              onClick={() => onChange({ month: "all" })}
              label="全部"
            />
            {monthOptions.map((m) => (
              <FilterChip
                key={m}
                pressed={filter.month === m}
                onClick={() => onChange({ month: m })}
                label={`${m.slice(0, 4)}年${Number(m.slice(5))}月`}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              pressed={filter.withBetOnly}
              onClick={() => onChange({ withBetOnly: !filter.withBetOnly })}
              label="只睇有投注場"
            />
          </div>
        </div>
      )}

      <div className="mt-2 text-[10px] text-text-subtle number-mono">
        顯示 {shownMeetings} / {totalMeetings} 場賽事
      </div>
    </section>
  );
}
