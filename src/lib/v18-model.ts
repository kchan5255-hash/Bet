import type { Race } from "./types";
import v18Data from "@/data/v18.json";

interface V18Top3Entry {
  no: string;
  name: string;
  prob: number;
  draw?: number;
}

interface V18RecommendCombo {
  combo: string;
  label: string;
}

interface V18Recommend {
  tier: "S" | "A" | "B";
  qinT12: V18RecommendCombo;
  qinBanker: V18RecommendCombo[];
  score: number;
  stakeMul: number;
}

interface V18RaceEntry {
  raceNo: number;
  meta: Record<string, unknown>;
  proTop3: V18Top3Entry[];
  fieldSize: number | null;
  gate: {
    action: "play" | "skip";
    tier: "S" | "A" | "B" | null;
    reasons: string[];
    riskFlags: string[];
    jtCombo: string | null;
    jWinRate: number | null;
    tWinRate: number | null;
    draw: number | null;
    class: number | null;
    lastBodyWeight: number | null;
    bodyDelta: number | null;
  };
  recommend: V18Recommend | null;
  actualTop3: string[];
}

interface V18DayEntry {
  date: string;
  venue: string;
  races: V18RaceEntry[];
}

interface V18Payload {
  dates: string[];
  byDate: Record<string, V18DayEntry>;
  generatedAt: string;
  notes?: string;
}

const DATA = v18Data as V18Payload;

const byDate = new Map<string, Map<number, V18RaceEntry>>();
for (const date of Object.keys(DATA.byDate ?? {})) {
  const day = DATA.byDate[date];
  const races = new Map<number, V18RaceEntry>();
  for (const race of day.races ?? []) {
    races.set(race.raceNo, race);
  }
  byDate.set(date, races);
}

export function getV18Entry(
  date: string | undefined,
  raceNo: number,
): V18RaceEntry | null {
  if (!date) return null;
  return byDate.get(date)?.get(raceNo) ?? null;
}

export function applyV18Model(race: Race, date?: string): Race {
  const entry = getV18Entry(date, race.raceNo);
  if (!entry || entry.proTop3.length < 3) {
    return race;
  }
  const probByNo = new Map<string, number>();
  for (const t of entry.proTop3) probByNo.set(String(t.no), t.prob);

  const restCount = Math.max(0, race.runners.length - entry.proTop3.length);
  const top3Sum = entry.proTop3.reduce((sum, t) => sum + (t.prob || 0), 0);
  const restShare = Math.max(0, 100 - top3Sum);
  const restEach = restCount > 0 ? restShare / restCount : 0;

  return {
    ...race,
    runners: race.runners.map((r) => ({
      ...r,
      modelProbability: probByNo.has(String(r.no))
        ? (probByNo.get(String(r.no)) as number)
        : restEach,
    })),
  };
}

export function getV18Recommend(
  date: string | undefined,
  raceNo: number,
): V18Recommend | null {
  return getV18Entry(date, raceNo)?.recommend ?? null;
}

export function isV18Available(date: string | undefined): boolean {
  if (!date) return false;
  return byDate.has(date);
}

export type { V18RaceEntry, V18Recommend };
export const V18_AVAILABLE_DATES = DATA.dates ?? [];
export const V18_NOTES = DATA.notes ?? "";
