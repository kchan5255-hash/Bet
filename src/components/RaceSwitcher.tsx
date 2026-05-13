"use client";

import { useRef, useEffect } from "react";
import type { Race } from "@/lib/types";
import { formatPostTime } from "@/lib/data";
import { cn } from "@/lib/utils";

interface RaceSwitcherProps {
  races: Race[];
  currentRaceNo: number;
  onSelect: (raceNo: number) => void;
}

export function RaceSwitcher({
  races,
  currentRaceNo,
  onSelect,
}: RaceSwitcherProps) {
  const current = races.find((r) => r.raceNo === currentRaceNo) ?? races[0];
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentRaceNo]);

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex items-center gap-3 bg-gradient-to-br from-upset/30 to-upset/10 px-4 py-3 flex-shrink-0 border-r border-border-subtle">
          <div className="number-mono text-3xl font-black text-white">
            {String(current.raceNo).padStart(2, "0")}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-text-muted font-medium">
              {formatPostTime(current.postTime)} · {current.going} · C+3
            </div>
            <div className="text-sm font-bold truncate">
              {current.className}，{current.distance}米
            </div>
            <div className="text-[11px] text-text-muted truncate">
              {current.raceName}
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-px overflow-x-auto scrollbar-none flex-1"
          style={{ scrollbarWidth: "none" }}
        >
          {races.map((race) => {
            const active = race.raceNo === currentRaceNo;
            const isCurrent = active;
            return (
              <button
                key={race.raceNo}
                ref={isCurrent ? activeRef : null}
                onClick={() => onSelect(race.raceNo)}
                className={cn(
                  "flex-shrink-0 w-16 py-3 text-center transition-all",
                  active
                    ? "bg-upset/20 border-b-2 border-upset"
                    : "bg-bg-subtle hover:bg-bg-elevated border-b-2 border-transparent",
                )}
              >
                <div
                  className={cn(
                    "number-mono text-lg font-bold",
                    active ? "text-white" : "text-text-muted",
                  )}
                >
                  {String(race.raceNo).padStart(2, "0")}
                </div>
                <div className="text-[10px] text-text-subtle mt-0.5">
                  {formatPostTime(race.postTime)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
