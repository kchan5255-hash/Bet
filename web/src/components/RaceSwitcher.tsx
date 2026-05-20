"use client";

import { useRef, useEffect } from "react";
import type { RaceCardMeta } from "@/lib/race-view-types";
import { formatPostTime } from "@/lib/meeting-utils";
import { cn } from "@/lib/utils";

interface RaceSwitcherProps {
  races: RaceCardMeta[];
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
    <div className="bento-card overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex items-center gap-3 bg-gradient-to-br from-upset/25 to-upset/5 px-4 py-3 flex-shrink-0 border-r border-border-subtle">
          <div className="number-mono text-3xl font-black text-white">
            {String(current.raceNo).padStart(2, "0")}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1 mb-1.5">
              <span className="rounded-full border border-border-subtle bg-bg-subtle px-2 py-0.5 text-[10px] text-text-muted">
                {formatPostTime(current.postTime)}
              </span>
              <span className="rounded-full border border-border-subtle bg-bg-subtle px-2 py-0.5 text-[10px] text-text-muted">
                {current.going}
              </span>
              <span className="rounded-full border border-border-subtle bg-bg-subtle px-2 py-0.5 text-[10px] text-text-muted">
                {current.distance}米
              </span>
            </div>
            <div className="text-sm font-bold truncate">{current.className}</div>
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
            return (
              <button
                key={race.raceNo}
                ref={active ? activeRef : null}
                onClick={() => onSelect(race.raceNo)}
                className={cn(
                  "flex-shrink-0 w-16 py-3 text-center transition-all",
                  active
                    ? "bg-upset/15 border-b-2 border-upset"
                    : "bg-bg-subtle hover:bg-bg-elevated border-b-2 border-transparent",
                )}
              >
                <div
                  className={cn(
                    "number-mono text-lg font-bold",
                    active ? "text-upset-glow" : "text-text-muted",
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
