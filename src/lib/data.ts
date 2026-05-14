import analysisResults from "@/data/analysis-results.json";
import coldBurstPicks from "@/data/cold-burst-picks.json";
import type { AnalysisResults, Race, Runner } from "./types";

interface ColdBurstPick {
  no: string;
  name: string;
  coldBurstScore: number;
  burstFactors: { factor: string; value: number }[];
  risks: string[];
  selectionTier: "burst" | "watch" | "backup";
}

interface ColdBurstRace {
  raceNo: number;
  picks: ColdBurstPick[];
}

interface ColdBurstData {
  date: string;
  generatedAt: string;
  version: string;
  races: ColdBurstRace[];
}

export function getRaces(): Race[] {
  return analysisResults as AnalysisResults;
}

export function getRace(raceNo: number): Race | undefined {
  return getRaces().find((r) => r.raceNo === raceNo);
}

export function getMeetingDate(): string {
  const first = getRaces()[0];
  if (!first) return "";
  return first.postTime.slice(0, 10);
}

export function formatMeetingDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

export function formatPostTime(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function sortRunnersByProb(runners: Runner[]): Runner[] {
  return [...runners].sort((a, b) => b.modelProbability - a.modelProbability);
}

export function sortRunnersByNo(runners: Runner[]): Runner[] {
  return [...runners].sort((a, b) => Number(a.no) - Number(b.no));
}

export interface ColdBurstRunner {
  runner: Runner;
  pick: ColdBurstPick;
}

export function getColdBurstPicks(race: Race): ColdBurstRunner[] {
  const data = coldBurstPicks as ColdBurstData;
  const entry = data.races.find((r) => r.raceNo === race.raceNo);
  if (!entry) return [];
  const byNo = new Map(race.runners.map((r) => [r.no, r]));
  const picks: ColdBurstRunner[] = [];
  for (const pick of entry.picks) {
    const runner = byNo.get(pick.no);
    if (runner) picks.push({ runner, pick });
  }
  return picks;
}

export function parseLast6(last6run: string): number[] {
  return last6run
    .split("/")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
}

export function findFavouriteNos(
  race: Race,
): { win?: string; place?: string } {
  let winBest: { no: string; value: number } | null = null;
  let placeBest: { no: string; value: number } | null = null;
  for (const r of race.runners) {
    if (typeof r.winOdds === "number" && Number.isFinite(r.winOdds)) {
      if (!winBest || r.winOdds < winBest.value) {
        winBest = { no: r.no, value: r.winOdds };
      }
    }
    if (typeof r.placeOdds === "number" && Number.isFinite(r.placeOdds)) {
      if (!placeBest || r.placeOdds < placeBest.value) {
        placeBest = { no: r.no, value: r.placeOdds };
      }
    }
  }
  return { win: winBest?.no, place: placeBest?.no };
}
