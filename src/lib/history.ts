import v19 from "@/data/v19.json";

export interface V19Pick {
  no: string;
  name: string;
  prob: number;
}

export interface V19Race {
  raceNo: number;
  meta: {
    titleBlock?: string;
    className: string;
    distance: number;
    going: string;
    course: string;
  };
  proTop3: V19Pick[];
  fieldSize: number;
  actualTop3: string[];
}

export interface HistoryMeeting {
  date: string;
  venue: string;
  races: V19Race[];
}

interface V19File {
  dates: string[];
  byDate: Record<
    string,
    {
      date: string;
      venue: string;
      races: V19Race[];
    }
  >;
}

const FILE = v19 as unknown as V19File;
const AUTO_FROM = "2026-05-01";

export function getHistoryMeetings(): HistoryMeeting[] {
  return FILE.dates
    .filter((d) => d >= AUTO_FROM)
    .map((d) => {
      const m = FILE.byDate[d];
      return {
        date: m.date,
        venue: m.venue,
        races: m.races,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getTopPicks(race: V19Race): string[] {
  return race.proTop3.map((p) => p.no);
}

export function isJudged(race: V19Race): boolean {
  return race.actualTop3.length > 0;
}

export function isHit(picks: string[], actualTop3: string[]): boolean {
  if (!actualTop3.length) return false;
  return picks.some((no) => actualTop3.includes(no));
}

export interface HitStats {
  totalRaces: number;
  judgedRaces: number;
  hitRaces: number;
  hitRate: number;
}

export function calcStats(meetings: HistoryMeeting[]): HitStats {
  let totalRaces = 0;
  let judgedRaces = 0;
  let hitRaces = 0;
  meetings.forEach((meeting) => {
    meeting.races.forEach((race) => {
      totalRaces += 1;
      if (!isJudged(race)) return;
      judgedRaces += 1;
      if (isHit(getTopPicks(race), race.actualTop3)) hitRaces += 1;
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

export function calcTrend(meetings: HistoryMeeting[]): TrendPoint[] {
  return meetings
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((meeting) => {
      let judged = 0;
      let hit = 0;
      meeting.races.forEach((race) => {
        if (!isJudged(race)) return;
        judged += 1;
        if (isHit(getTopPicks(race), race.actualTop3)) hit += 1;
      });
      return {
        date: meeting.date,
        hitRate: judged > 0 ? (hit / judged) * 100 : 0,
        judged,
        hit,
      };
    })
    .filter((p) => p.judged > 0);
}

export function pickByNo(race: V19Race, no: string): V19Pick | undefined {
  return race.proTop3.find((p) => p.no === no);
}
