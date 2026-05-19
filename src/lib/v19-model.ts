import type { Race } from "./types";
import v19Data from "@/data/v19.json";

interface V19Top3Entry {
  no: string;
  name: string;
  prob: number;
  draw?: number;
}

interface V19RecommendCombo {
  combo: string;
  label: string;
}

interface V19Recommend {
  tier: "S" | "A" | "B";
  qinT12: V19RecommendCombo;
  qinBanker: V19RecommendCombo[];
  score: number;
  stakeMul: number;
  boost?: string | null;
}

interface V19RaceEntry {
  raceNo: number;
  meta: Record<string, unknown>;
  proTop3: V19Top3Entry[];
  fieldSize: number | null;
  gate: {
    action: "play" | "skip";
    tier: "S" | "A" | "B" | null;
    reason: string | null;
    reasons: string[];
    riskFlags: string[];
    jtCombo: string | null;
    jWinRate: number | null;
    tWinRate: number | null;
    draw: number | null;
    class: number | null;
    lastBodyWeight: number | null;
    bodyDelta: number | null;
    v18Tier: "S" | "A" | "B" | null;
    boost: string | null;
  };
  recommend: V19Recommend | null;
  actualTop3: string[];
}

interface V19DayEntry {
  date: string;
  venue: string;
  races: V19RaceEntry[];
}

interface V19Payload {
  dates: string[];
  byDate: Record<string, V19DayEntry>;
  generatedAt: string;
  notes?: string;
}

const DATA = v19Data as V19Payload;

const byDate = new Map<string, Map<number, V19RaceEntry>>();
for (const date of Object.keys(DATA.byDate ?? {})) {
  const day = DATA.byDate[date];
  const races = new Map<number, V19RaceEntry>();
  for (const race of day.races ?? []) {
    races.set(race.raceNo, race);
  }
  byDate.set(date, races);
}

export function getV19Entry(
  date: string | undefined,
  raceNo: number,
): V19RaceEntry | null {
  if (!date) return null;
  return byDate.get(date)?.get(raceNo) ?? null;
}

export function applyV19Model(race: Race, date?: string): Race {
  const entry = getV19Entry(date, race.raceNo);
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

export function getV19Recommend(
  date: string | undefined,
  raceNo: number,
): V19Recommend | null {
  return getV19Entry(date, raceNo)?.recommend ?? null;
}

export function isV19Available(date: string | undefined): boolean {
  if (!date) return false;
  return byDate.has(date);
}

export type { V19RaceEntry, V19Recommend };
export const V19_AVAILABLE_DATES = DATA.dates ?? [];
export const V19_NOTES = DATA.notes ?? "";
