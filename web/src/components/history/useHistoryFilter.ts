"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { HistoryMeetingView, TierKey } from "@/lib/history-view-types";

export type VenueFilter = "all" | "ST" | "HV";
export type HitFilter = "all" | "hit" | "miss" | "pending";
export type TierFilter = "all" | TierKey;

export interface HistoryFilterState {
  venue: VenueFilter;
  hit: HitFilter;
  tier: TierFilter;
  month: string;
  withBetOnly: boolean;
}

export const DEFAULT_FILTER: HistoryFilterState = {
  venue: "all",
  hit: "all",
  tier: "all",
  month: "all",
  withBetOnly: false,
};

const VENUE_VALUES: VenueFilter[] = ["all", "ST", "HV"];
const HIT_VALUES: HitFilter[] = ["all", "hit", "miss", "pending"];
const TIER_VALUES: TierFilter[] = ["all", "S", "A", "B", "none"];

function parseEnum<T extends string>(
  raw: string | null,
  values: readonly T[],
  fallback: T,
): T {
  if (!raw) return fallback;
  return (values as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export function useHistoryFilter(
  meetings: HistoryMeetingView[],
): {
  filter: HistoryFilterState;
  setFilter: (patch: Partial<HistoryFilterState>) => void;
  reset: () => void;
  filtered: HistoryMeetingView[];
  isFiltered: boolean;
  monthOptions: string[];
} {
  const router = useRouter();
  const params = useSearchParams();

  const filter = useMemo<HistoryFilterState>(
    () => ({
      venue: parseEnum(params.get("venue"), VENUE_VALUES, "all"),
      hit: parseEnum(params.get("hit"), HIT_VALUES, "all"),
      tier: parseEnum(params.get("tier"), TIER_VALUES, "all"),
      month: params.get("month") ?? "all",
      withBetOnly: params.get("bet") === "1",
    }),
    [params],
  );

  const setFilter = useCallback(
    (patch: Partial<HistoryFilterState>) => {
      const next = { ...filter, ...patch };
      const sp = new URLSearchParams(params.toString());
      if (next.venue === "all") sp.delete("venue");
      else sp.set("venue", next.venue);
      if (next.hit === "all") sp.delete("hit");
      else sp.set("hit", next.hit);
      if (next.tier === "all") sp.delete("tier");
      else sp.set("tier", next.tier);
      if (next.month === "all") sp.delete("month");
      else sp.set("month", next.month);
      if (!next.withBetOnly) sp.delete("bet");
      else sp.set("bet", "1");
      const qs = sp.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [filter, params, router],
  );

  const reset = useCallback(() => {
    router.replace("?", { scroll: false });
  }, [router]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of meetings) {
      if (m.date) set.add(m.date.slice(0, 7));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [meetings]);

  const filtered = useMemo(() => {
    return meetings
      .map((meeting) => {
        if (filter.venue !== "all" && meeting.venue !== filter.venue) return null;
        if (filter.month !== "all" && !meeting.date.startsWith(filter.month))
          return null;

        const races = meeting.races.filter((race) => {
          if (filter.hit === "hit" && !(race.judged && race.hit)) return false;
          if (filter.hit === "miss" && !(race.judged && !race.hit)) return false;
          if (filter.hit === "pending" && race.judged) return false;
          if (filter.tier !== "all" && race.tier !== filter.tier) return false;
          if (filter.withBetOnly && !race.bankerPnl.hasBet && !race.crossPnl.hasBet)
            return false;
          return true;
        });

        if (races.length === 0) return null;

        const judged = races.filter((r) => r.judged).length;
        const hit = races.filter((r) => r.judged && r.hit).length;

        return {
          ...meeting,
          raceCount: races.length,
          judged,
          hit,
          rate: judged > 0 ? (hit / judged) * 100 : 0,
          races,
        };
      })
      .filter((m): m is HistoryMeetingView => m !== null);
  }, [meetings, filter]);

  const isFiltered =
    filter.venue !== "all" ||
    filter.hit !== "all" ||
    filter.tier !== "all" ||
    filter.month !== "all" ||
    filter.withBetOnly;

  return {
    filter,
    setFilter,
    reset,
    filtered,
    isFiltered,
    monthOptions,
  };
}
