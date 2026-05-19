import analysisByDate from "@/data/analysis-by-date.json";
import type { AnalysisResults, Race, Runner } from "./types";

export interface MeetingMeta {
  date: string;
  venue: string;
  venueName: string;
  weekday: string;
  raceCount: number;
}

interface AnalysisByDate {
  dates: MeetingMeta[];
  byDate: Record<string, AnalysisResults>;
}

const ANALYSIS = analysisByDate as AnalysisByDate;

export function getMeetings(): MeetingMeta[] {
  return ANALYSIS.dates;
}

export function getLatestMeetingDate(): string {
  const dates = ANALYSIS.dates;
  return dates[dates.length - 1]?.date ?? "";
}

export function getRaces(date?: string): Race[] {
  const target = date ?? getLatestMeetingDate();
  return ANALYSIS.byDate[target] ?? [];
}

export function getRace(raceNo: number, date?: string): Race | undefined {
  return getRaces(date).find((r) => r.raceNo === raceNo);
}

export function getMeetingDate(): string {
  return getLatestMeetingDate();
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
