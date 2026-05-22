"use client";

import { useEffect, useRef } from "react";
import { formatPostTime } from "@/lib/meeting-utils";
import type { RaceTabMeta } from "@/lib/race-view-types";
import { cn } from "@/lib/utils";

interface RaceTabsProps {
  tabs: RaceTabMeta[];
  currentRaceNo: number;
  onSelect: (raceNo: number) => void;
}

export function RaceTabs({ tabs, currentRaceNo, onSelect }: RaceTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentRaceNo]);

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const idx = tabs.findIndex((t) => t.raceNo === currentRaceNo);
    if (idx < 0) return;
    const next =
      e.key === "ArrowLeft"
        ? Math.max(0, idx - 1)
        : Math.min(tabs.length - 1, idx + 1);
    if (next !== idx) {
      e.preventDefault();
      onSelect(tabs[next].raceNo);
    }
  };

  return (
    <div
      ref={scrollRef}
      role="tablist"
      aria-label="賽事場次"
      onKeyDown={handleKey}
      className="bento-card flex gap-1.5 overflow-x-auto p-1.5 scrollbar-none"
      style={{ scrollbarWidth: "none" }}
    >
      {tabs.map((tab) => {
        const active = tab.raceNo === currentRaceNo;
        const aria = active ? { "aria-current": "page" as const } : {};
        return (
          <button
            key={tab.raceNo}
            ref={active ? activeRef : null}
            type="button"
            role="tab"
            aria-pressed={active}
            aria-label={`第 ${tab.raceNo} 場 ${formatPostTime(tab.postTime)}${tab.isPast ? " 已開跑" : ""}`}
            {...aria}
            onClick={() => onSelect(tab.raceNo)}
            className={cn(
              "relative flex min-w-[60px] shrink-0 flex-col items-center gap-1 rounded-md px-2 py-2 text-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-ai-start",
              active
                ? "bg-upset/20 border-b-2 border-upset"
                : "bg-bg-subtle hover:bg-bg-elevated border-b-2 border-transparent",
              tab.isPast && !active && "opacity-50 grayscale",
            )}
          >
            <div
              className={cn(
                "number-mono text-base font-black leading-none md:text-lg",
                active ? "text-upset-glow" : "text-text-muted",
              )}
            >
              {String(tab.raceNo).padStart(2, "0")}
            </div>
            <div className="text-[9px] text-text-subtle leading-none">
              {formatPostTime(tab.postTime)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
