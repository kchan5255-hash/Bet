import "server-only";

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "src", "data");

const cache = new Map<string, { mtime: number; data: unknown }>();

function readJson<T>(filename: string): T {
  const filepath = path.join(DATA_DIR, filename);
  const mtime = fs.statSync(filepath).mtimeMs;
  const hit = cache.get(filename);
  if (hit && hit.mtime === mtime) return hit.data as T;
  const data = JSON.parse(fs.readFileSync(filepath, "utf8")) as T;
  cache.set(filename, { mtime, data });
  return data;
}

function readV19(): V19File {
  return readJson("v19.json");
}

function readDividends(): DividendsFile {
  return readJson("dividends-by-date.json");
}

export interface V19Pick {
  no: string;
  name: string;
  prob: number;
}

export interface V19Recommend {
  tier: "S" | "A" | "B";
  qinT12?: { combo: string; label: string };
  qinBanker?: { combo: string; label: string }[];
  score?: number;
  stakeMul?: number;
  boost?: string | null;
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
  recommend?: V19Recommend | null;
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

const AUTO_FROM = "2026-05-01";

export const V19_SKIP_DISTANCES = [1000, 1650, 2000, 2200];
export const V19_BOOST_DISTANCES = [1400, 1600];

export function getHistoryMeetings(): HistoryMeeting[] {
  const FILE = readV19();
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

interface DividendRow {
  pool: string;
  combo: string;
  dividend: string;
}

interface DividendsFile {
  byDate: Record<
    string,
    {
      date: string;
      venue: string;
      races: { raceNo: number; dividends: DividendRow[] }[];
    }
  >;
}

const STAKE_PER_BET = 100;
const DIVIDEND_UNIT = 10;
export const QIN_POOLS = ["連贏", "位置Q"] as const;
export type QinPool = (typeof QIN_POOLS)[number];

function normaliseCombo(combo: string): string {
  return combo
    .split(",")
    .map((s) => Number(s.trim()))
    .sort((a, b) => a - b)
    .join(",");
}

function getPoolDividend(
  date: string,
  raceNo: number,
  pool: string,
  combo: string,
): number {
  const day = readDividends().byDate?.[date];
  if (!day) return 0;
  const race = day.races.find((r) => r.raceNo === raceNo);
  if (!race) return 0;
  const target = normaliseCombo(combo);

  // dividends-by-date.json 格式: { pool: [{ combo, amount }] }
  const raw = race.dividends as unknown as Record<string, { combo: string; amount: number }[]>;
  const entries = raw[pool];
  if (!entries) return 0;
  const match = entries.find((e) => normaliseCombo(e.combo) === target);
  if (!match) return 0;
  return (match.amount * STAKE_PER_BET) / DIVIDEND_UNIT;
}

export interface PoolPnl {
  bets: number;
  stake: number;
  ret: number;
  pnl: number;
  wins: number;
}

export interface RacePnl {
  hasBet: boolean;
  judged: boolean;
  bets: number;
  stake: number;
  ret: number;
  pnl: number;
  wins: number;
  byPool: Record<QinPool, PoolPnl>;
}

function emptyPool(): PoolPnl {
  return { bets: 0, stake: 0, ret: 0, pnl: 0, wins: 0 };
}

export function calcRacePnl(date: string, race: V19Race): RacePnl {
  return calcRacePnlInternal(date, race, "banker");
}

export function calcRacePnlCross(date: string, race: V19Race): RacePnl {
  return calcRacePnlInternal(date, race, "cross");
}

type BetMode = "banker" | "cross";

function getBetCombos(race: V19Race, mode: BetMode): { combo: string; label: string }[] {
  const banker = race.recommend?.qinBanker ?? [];
  if (mode === "banker") return banker;
  if (banker.length < 2) return banker;
  const t1Pair = banker[0]?.combo?.split(",") ?? [];
  const t1 = t1Pair[0];
  const t2 = t1Pair[1];
  const t3Pair = banker[1]?.combo?.split(",") ?? [];
  const t3 = t3Pair[1];
  if (!t1 || !t2 || !t3) return banker;
  return [
    { combo: [t1, t2].sort().join(","), label: `${t1}-${t2}` },
    { combo: [t1, t3].sort().join(","), label: `${t1}-${t3}` },
    { combo: [t2, t3].sort().join(","), label: `${t2}-${t3}` },
  ];
}

function calcRacePnlInternal(date: string, race: V19Race, mode: BetMode): RacePnl {
  const combos = getBetCombos(race, mode);
  const judged = isJudged(race);
  const byPool: Record<QinPool, PoolPnl> = {
    連贏: emptyPool(),
    位置Q: emptyPool(),
  };
  for (const pool of QIN_POOLS) {
    byPool[pool].bets = combos.length;
    byPool[pool].stake = combos.length * STAKE_PER_BET;
  }
  const totalBets = combos.length * QIN_POOLS.length;
  const empty: RacePnl = {
    hasBet: combos.length > 0,
    judged,
    bets: totalBets,
    stake: totalBets * STAKE_PER_BET,
    ret: 0,
    pnl: 0,
    wins: 0,
    byPool,
  };
  if (!combos.length || !judged) return empty;

  let ret = 0;
  let wins = 0;
  for (const b of combos) {
    for (const pool of QIN_POOLS) {
      const amount = getPoolDividend(date, race.raceNo, pool, b.combo);
      if (amount > 0) {
        ret += amount;
        wins += 1;
        byPool[pool].ret += amount;
        byPool[pool].wins += 1;
      }
    }
  }
  for (const pool of QIN_POOLS) {
    byPool[pool].pnl = byPool[pool].ret - byPool[pool].stake;
  }
  return {
    hasBet: true,
    judged: true,
    bets: totalBets,
    stake: totalBets * STAKE_PER_BET,
    ret,
    pnl: ret - totalBets * STAKE_PER_BET,
    wins,
    byPool,
  };
}

export interface PnlSummary {
  bets: number;
  stake: number;
  ret: number;
  pnl: number;
  roi: number;
  wins: number;
  judgedBets: number;
  byPool: Record<QinPool, PoolPnl & { roi: number }>;
}

function emptySummary(): PnlSummary {
  return {
    bets: 0,
    stake: 0,
    ret: 0,
    pnl: 0,
    roi: 0,
    wins: 0,
    judgedBets: 0,
    byPool: {
      連贏: { ...emptyPool(), roi: 0 },
      位置Q: { ...emptyPool(), roi: 0 },
    },
  };
}

function finaliseSummary(sum: PnlSummary): PnlSummary {
  sum.pnl = sum.ret - sum.stake;
  sum.roi = sum.stake > 0 ? sum.pnl / sum.stake : 0;
  for (const pool of QIN_POOLS) {
    const p = sum.byPool[pool];
    p.pnl = p.ret - p.stake;
    p.roi = p.stake > 0 ? p.pnl / p.stake : 0;
  }
  return sum;
}

export function calcMeetingPnl(meeting: HistoryMeeting): PnlSummary {
  return calcMeetingPnlInternal(meeting, "banker");
}

export function calcMeetingPnlCross(meeting: HistoryMeeting): PnlSummary {
  return calcMeetingPnlInternal(meeting, "cross");
}

function calcMeetingPnlInternal(meeting: HistoryMeeting, mode: BetMode): PnlSummary {
  const sum = emptySummary();
  for (const race of meeting.races) {
    const p = mode === "cross"
      ? calcRacePnlCross(meeting.date, race)
      : calcRacePnl(meeting.date, race);
    if (!p.hasBet || !p.judged) continue;
    sum.bets += p.bets;
    sum.judgedBets += p.bets;
    sum.stake += p.stake;
    sum.ret += p.ret;
    sum.wins += p.wins;
    for (const pool of QIN_POOLS) {
      sum.byPool[pool].bets += p.byPool[pool].bets;
      sum.byPool[pool].stake += p.byPool[pool].stake;
      sum.byPool[pool].ret += p.byPool[pool].ret;
      sum.byPool[pool].wins += p.byPool[pool].wins;
    }
  }
  return finaliseSummary(sum);
}

export function calcOverallPnl(meetings: HistoryMeeting[]): PnlSummary {
  return calcOverallPnlInternal(meetings, "banker");
}

export function calcOverallPnlCross(meetings: HistoryMeeting[]): PnlSummary {
  return calcOverallPnlInternal(meetings, "cross");
}

function calcOverallPnlInternal(meetings: HistoryMeeting[], mode: BetMode): PnlSummary {
  const sum = emptySummary();
  for (const meeting of meetings) {
    const m = mode === "cross"
      ? calcMeetingPnlCross(meeting)
      : calcMeetingPnl(meeting);
    sum.bets += m.bets;
    sum.judgedBets += m.judgedBets;
    sum.stake += m.stake;
    sum.ret += m.ret;
    sum.wins += m.wins;
    for (const pool of QIN_POOLS) {
      sum.byPool[pool].bets += m.byPool[pool].bets;
      sum.byPool[pool].stake += m.byPool[pool].stake;
      sum.byPool[pool].ret += m.byPool[pool].ret;
      sum.byPool[pool].wins += m.byPool[pool].wins;
    }
  }
  return finaliseSummary(sum);
}

export interface EquityPoint {
  date: string;
  cumPnl: number;
  dailyPnl: number;
  hitRate: number;
  judged: number;
  hit: number;
  bets: number;
}

export function calcEquityCurve(meetings: HistoryMeeting[], mode: BetMode): EquityPoint[] {
  const sorted = meetings
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  let cum = 0;
  const points: EquityPoint[] = [];
  for (const meeting of sorted) {
    let dailyPnl = 0;
    let dailyBets = 0;
    let judged = 0;
    let hit = 0;
    for (const race of meeting.races) {
      const p = mode === "cross"
        ? calcRacePnlCross(meeting.date, race)
        : calcRacePnl(meeting.date, race);
      if (p.hasBet && p.judged) {
        dailyPnl += p.pnl;
        dailyBets += p.bets;
      }
      if (isJudged(race)) {
        judged += 1;
        if (isHit(getTopPicks(race), race.actualTop3)) hit += 1;
      }
    }
    cum += dailyPnl;
    points.push({
      date: meeting.date,
      cumPnl: cum,
      dailyPnl,
      hitRate: judged > 0 ? (hit / judged) * 100 : 0,
      judged,
      hit,
      bets: dailyBets,
    });
  }
  return points;
}

export interface StreakInfo {
  longestWin: number;
  longestLoss: number;
  currentType: "win" | "loss" | "none";
  currentLen: number;
}

export function calcStreaks(meetings: HistoryMeeting[], mode: BetMode): StreakInfo {
  const sorted = meetings
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  let longestWin = 0;
  let longestLoss = 0;
  let curType: "win" | "loss" | "none" = "none";
  let curLen = 0;
  for (const meeting of sorted) {
    for (const race of meeting.races) {
      const p = mode === "cross"
        ? calcRacePnlCross(meeting.date, race)
        : calcRacePnl(meeting.date, race);
      if (!p.hasBet || !p.judged) continue;
      const isWin = p.pnl > 0;
      const t: "win" | "loss" = isWin ? "win" : "loss";
      if (curType === t) {
        curLen += 1;
      } else {
        curType = t;
        curLen = 1;
      }
      if (t === "win" && curLen > longestWin) longestWin = curLen;
      if (t === "loss" && curLen > longestLoss) longestLoss = curLen;
    }
  }
  return {
    longestWin,
    longestLoss,
    currentType: curType,
    currentLen: curLen,
  };
}

export interface DrawdownInfo {
  maxDrawdown: number;
  maxDrawdownPct: number;
}

export function calcMaxDrawdown(equity: EquityPoint[]): DrawdownInfo {
  let peak = 0;
  let maxDd = 0;
  let maxDdPct = 0;
  for (const p of equity) {
    if (p.cumPnl > peak) peak = p.cumPnl;
    const dd = p.cumPnl - peak;
    if (dd < maxDd) {
      maxDd = dd;
      maxDdPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }
  return { maxDrawdown: maxDd, maxDrawdownPct: maxDdPct };
}

export function calcProfitFactor(meetings: HistoryMeeting[], mode: BetMode): number {
  let grossWin = 0;
  let grossLoss = 0;
  for (const meeting of meetings) {
    for (const race of meeting.races) {
      const p = mode === "cross"
        ? calcRacePnlCross(meeting.date, race)
        : calcRacePnl(meeting.date, race);
      if (!p.hasBet || !p.judged) continue;
      if (p.pnl > 0) grossWin += p.pnl;
      else if (p.pnl < 0) grossLoss += -p.pnl;
    }
  }
  if (grossLoss === 0) return grossWin > 0 ? Infinity : 0;
  return grossWin / grossLoss;
}

export interface VenueBreakdown {
  venue: string;
  races: number;
  judged: number;
  hit: number;
  rate: number;
  bets: number;
  stake: number;
  pnl: number;
  roi: number;
}

export function calcVenueBreakdown(meetings: HistoryMeeting[], mode: BetMode): VenueBreakdown[] {
  const map = new Map<string, VenueBreakdown>();
  for (const meeting of meetings) {
    const v = meeting.venue || "—";
    let row = map.get(v);
    if (!row) {
      row = { venue: v, races: 0, judged: 0, hit: 0, rate: 0, bets: 0, stake: 0, pnl: 0, roi: 0 };
      map.set(v, row);
    }
    for (const race of meeting.races) {
      row.races += 1;
      if (isJudged(race)) {
        row.judged += 1;
        if (isHit(getTopPicks(race), race.actualTop3)) row.hit += 1;
      }
      const p = mode === "cross"
        ? calcRacePnlCross(meeting.date, race)
        : calcRacePnl(meeting.date, race);
      if (p.hasBet && p.judged) {
        row.bets += p.bets;
        row.stake += p.stake;
        row.pnl += p.pnl;
      }
    }
  }
  for (const row of map.values()) {
    row.rate = row.judged > 0 ? (row.hit / row.judged) * 100 : 0;
    row.roi = row.stake > 0 ? row.pnl / row.stake : 0;
  }
  return Array.from(map.values()).sort((a, b) => b.races - a.races);
}

export interface DistanceBreakdown {
  distance: number;
  isV19Skip: boolean;
  isV19Boost: boolean;
  races: number;
  judged: number;
  hit: number;
  rate: number;
  bets: number;
  stake: number;
  pnl: number;
  roi: number;
}

export function calcDistanceBreakdown(meetings: HistoryMeeting[], mode: BetMode): DistanceBreakdown[] {
  const map = new Map<number, DistanceBreakdown>();
  for (const meeting of meetings) {
    for (const race of meeting.races) {
      const dist = race.meta.distance;
      if (!dist) continue;
      let row = map.get(dist);
      if (!row) {
        row = {
          distance: dist,
          isV19Skip: V19_SKIP_DISTANCES.includes(dist),
          isV19Boost: V19_BOOST_DISTANCES.includes(dist),
          races: 0,
          judged: 0,
          hit: 0,
          rate: 0,
          bets: 0,
          stake: 0,
          pnl: 0,
          roi: 0,
        };
        map.set(dist, row);
      }
      row.races += 1;
      if (isJudged(race)) {
        row.judged += 1;
        if (isHit(getTopPicks(race), race.actualTop3)) row.hit += 1;
      }
      const p = mode === "cross"
        ? calcRacePnlCross(meeting.date, race)
        : calcRacePnl(meeting.date, race);
      if (p.hasBet && p.judged) {
        row.bets += p.bets;
        row.stake += p.stake;
        row.pnl += p.pnl;
      }
    }
  }
  for (const row of map.values()) {
    row.rate = row.judged > 0 ? (row.hit / row.judged) * 100 : 0;
    row.roi = row.stake > 0 ? row.pnl / row.stake : 0;
  }
  return Array.from(map.values()).sort((a, b) => a.distance - b.distance);
}

export type TierBreakdownKey = "S" | "A" | "B" | "none";

export interface TierBreakdown {
  tier: TierBreakdownKey;
  races: number;
  judged: number;
  hit: number;
  rate: number;
  bets: number;
  stake: number;
  pnl: number;
  roi: number;
}

export function getRaceTier(race: V19Race): TierBreakdownKey {
  return (race.recommend?.tier ?? "none") as TierBreakdownKey;
}

export function calcTierBreakdown(meetings: HistoryMeeting[], mode: BetMode): TierBreakdown[] {
  const order: TierBreakdownKey[] = ["S", "A", "B", "none"];
  const map = new Map<TierBreakdownKey, TierBreakdown>();
  for (const t of order) {
    map.set(t, { tier: t, races: 0, judged: 0, hit: 0, rate: 0, bets: 0, stake: 0, pnl: 0, roi: 0 });
  }
  for (const meeting of meetings) {
    for (const race of meeting.races) {
      const tier = getRaceTier(race);
      const row = map.get(tier)!;
      row.races += 1;
      if (isJudged(race)) {
        row.judged += 1;
        if (isHit(getTopPicks(race), race.actualTop3)) row.hit += 1;
      }
      const p = mode === "cross"
        ? calcRacePnlCross(meeting.date, race)
        : calcRacePnl(meeting.date, race);
      if (p.hasBet && p.judged) {
        row.bets += p.bets;
        row.stake += p.stake;
        row.pnl += p.pnl;
      }
    }
  }
  for (const row of map.values()) {
    row.rate = row.judged > 0 ? (row.hit / row.judged) * 100 : 0;
    row.roi = row.stake > 0 ? row.pnl / row.stake : 0;
  }
  return order.map((t) => map.get(t)!).filter((row) => row.races > 0);
}
