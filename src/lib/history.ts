import type { Race, Runner } from "./types";

import history_20260513 from "@/data/history/2026-05-13.json";

export interface HistoryMeeting {
  date: string;
  races: Race[];
}

export interface MeetingResults {
  [raceNo: number]: string[];
}

const HISTORY: HistoryMeeting[] = [
  { date: "2026-05-13", races: history_20260513 as Race[] },
];

export function getHistoryMeetings(): HistoryMeeting[] {
  return [...HISTORY].sort((a, b) => b.date.localeCompare(a.date));
}

export function getTopFourNos(race: Race): string[] {
  return [...race.runners]
    .sort((a, b) => b.modelProbability - a.modelProbability)
    .slice(0, 4)
    .map((r) => r.no);
}

export function isHit(topFour: string[], actualTop3: string[]): boolean {
  if (!actualTop3.length) return false;
  return topFour.some((no) => actualTop3.includes(no));
}

const STORAGE_KEY = "furlong_race_results";

export function loadResults(): Record<string, MeetingResults> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MeetingResults>;
  } catch {
    return {};
  }
}

export function saveResults(data: Record<string, MeetingResults>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function setRaceResult(
  date: string,
  raceNo: number,
  top3: string[],
): void {
  const all = loadResults();
  const meeting = all[date] ?? {};
  meeting[raceNo] = top3;
  all[date] = meeting;
  saveResults(all);
}

export function getRaceResult(
  date: string,
  raceNo: number,
  store?: Record<string, MeetingResults>,
): string[] {
  const all = store ?? loadResults();
  return all[date]?.[raceNo] ?? [];
}

export interface HitStats {
  totalRaces: number;
  judgedRaces: number;
  hitRaces: number;
  hitRate: number;
}

export function calcStats(
  meetings: HistoryMeeting[],
  store: Record<string, MeetingResults>,
): HitStats {
  let totalRaces = 0;
  let judgedRaces = 0;
  let hitRaces = 0;
  meetings.forEach((meeting) => {
    meeting.races.forEach((race) => {
      totalRaces += 1;
      const actual = getRaceResult(meeting.date, race.raceNo, store);
      if (!actual.length) return;
      judgedRaces += 1;
      const topFour = getTopFourNos(race);
      if (isHit(topFour, actual)) hitRaces += 1;
    });
  });
  return {
    totalRaces,
    judgedRaces,
    hitRaces,
    hitRate: judgedRaces > 0 ? hitRaces / judgedRaces : 0,
  };
}

export interface TrendPoint {
  date: string;
  hitRate: number;
  judged: number;
  hit: number;
}

export function calcTrend(
  meetings: HistoryMeeting[],
  store: Record<string, MeetingResults>,
): TrendPoint[] {
  return meetings
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((meeting) => {
      let judged = 0;
      let hit = 0;
      meeting.races.forEach((race) => {
        const actual = getRaceResult(meeting.date, race.raceNo, store);
        if (!actual.length) return;
        judged += 1;
        const topFour = getTopFourNos(race);
        if (isHit(topFour, actual)) hit += 1;
      });
      return {
        date: meeting.date,
        hitRate: judged > 0 ? (hit / judged) * 100 : 0,
        judged,
        hit,
      };
    });
}

export function runnerByNo(
  race: Race,
  no: string,
): Runner | undefined {
  return race.runners.find((r) => r.no === no);
}
