import resultsData from "@/data/race-results.json";
import dividendsData from "@/data/race-dividends.json";
import analysisResults from "@/data/analysis-results.json";
import type { AnalysisResults, Runner } from "./types";

export interface ResultRunner {
  plc: string;
  no: string;
  name: string;
  code: string;
  jockey: string;
  trainer: string;
  draw: number;
  lbw: string;
  finishTime: string;
}

export interface ResultRace {
  raceNo: number;
  titleBlock: string;
  raceName: string;
  className: string;
  distance: number;
  going: string;
  course: string;
  postTime: string;
  top4: Pick<
    ResultRunner,
    "plc" | "no" | "name" | "code" | "jockey" | "trainer" | "draw"
  >[];
  runners: ResultRunner[];
}

export interface ResultsPayload {
  date: string;
  venue: string;
  venueName: string;
  scrapedAt: string;
  races: ResultRace[];
}

export function getResults(): ResultsPayload {
  return resultsData as ResultsPayload;
}

export interface DividendRow {
  pool: string;
  combo: string;
  dividend: string;
}

interface DividendsPayload {
  date: string;
  venue: string;
  races: { raceNo: number; dividends: DividendRow[] }[];
}

export function getDividends(raceNo: number): DividendRow[] {
  const data = dividendsData as DividendsPayload;
  const entry = data.races.find((r) => r.raceNo === raceNo);
  return entry?.dividends ?? [];
}

export interface PoolGroup {
  pool: string;
  rows: DividendRow[];
}

const POOL_ORDER = [
  "獨贏",
  "位置",
  "連贏",
  "位置Q",
  "二重彩",
  "三重彩",
  "單T",
  "四連環",
  "四重彩",
  "三T",
  "六環彩",
];

export function groupDividends(rows: DividendRow[]): PoolGroup[] {
  const map = new Map<string, DividendRow[]>();
  for (const r of rows) {
    if (!map.has(r.pool)) map.set(r.pool, []);
    map.get(r.pool)!.push(r);
  }
  return [...map.entries()]
    .map(([pool, rs]) => ({ pool, rows: rs }))
    .sort((a, b) => {
      const ai = POOL_ORDER.indexOf(a.pool);
      const bi = POOL_ORDER.indexOf(b.pool);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
}

export function getResultRace(raceNo: number): ResultRace | undefined {
  return getResults().races.find((r) => r.raceNo === raceNo);
}

export function getModelRanking(raceNo: number): Map<string, number> {
  const races = analysisResults as AnalysisResults;
  const race = races.find((r) => r.raceNo === raceNo);
  const map = new Map<string, number>();
  if (!race) return map;
  const sorted = [...race.runners].sort(
    (a: Runner, b: Runner) => b.modelProbability - a.modelProbability,
  );
  sorted.forEach((r, idx) => {
    map.set(r.no, idx + 1);
  });
  return map;
}

export function getRunnerScores(raceNo: number): Map<string, number> {
  const races = analysisResults as AnalysisResults;
  const race = races.find((r) => r.raceNo === raceNo);
  const map = new Map<string, number>();
  if (!race) return map;
  for (const r of race.runners) {
    map.set(r.no, Math.round(r.rawScore * 100));
  }
  return map;
}

export type VideoKind =
  | "replay"
  | "patrol"
  | "frontrunner"
  | "aerial"
  | "passthrough";

const VIDEO_LABELS: Record<VideoKind, string> = {
  replay: "賽事重溫",
  patrol: "巡邏影片",
  frontrunner: "前領馬匹近鏡",
  aerial: "航拍影片",
  passthrough: "餘暉分析",
};

const VIDEO_TYPE_PARAM: Record<VideoKind, string> = {
  replay: "replay-full",
  patrol: "replay-patrol",
  frontrunner: "replay-leading",
  aerial: "replay-drone",
  passthrough: "passthrough",
};

export function videoLabel(kind: VideoKind): string {
  return VIDEO_LABELS[kind];
}

function pad2(n: number | string): string {
  return String(n).padStart(2, "0");
}

function dateSlash(date: string): string {
  const [y, m, d] = date.split("-");
  return `${y}/${pad2(m)}/${pad2(d)}`;
}

function dateCompact(date: string): string {
  const [y, m, d] = date.split("-");
  return `${y}${pad2(m)}${pad2(d)}`;
}

const VIDEO_HOST = "https://racing.hkjc.com";
const VIDEO_PATH = "/contentAsset/videoplayer_v4/video-player-iframe_v4.html";

export function buildVideoUrl(
  kind: VideoKind,
  date: string,
  venue: string,
  raceNo: number,
): string {
  void venue;
  const params = new URLSearchParams({
    type: VIDEO_TYPE_PARAM[kind],
    date: dateCompact(date),
    no: pad2(raceNo),
    lang: "chi",
  });
  return `${VIDEO_HOST}${VIDEO_PATH}?${params.toString()}`;
}

export function buildAllInOneReplayUrl(
  date: string,
  venue: string,
  raceNo: number,
): string {
  return buildVideoUrl("replay", date, venue, raceNo);
}

export function buildResultPageUrl(
  date: string,
  venue: string,
  raceNo: number,
): string {
  return `https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=${dateSlash(
    date,
  )}&Racecourse=${venue}&RaceNo=${raceNo}`;
}

export function buildHorseProfileUrl(code: string): string {
  return `https://racing.hkjc.com/racing/information/Chinese/Horse/Horse.aspx?HorseId=${code}`;
}

export function formatPostTimeShort(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16);
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${hh}:${mm}`;
}

export function weekdayLabel(date: string): string {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00+08:00`);
  if (Number.isNaN(d.getTime())) return "";
  return ["週日", "週一", "週二", "週三", "週四", "週五", "週六"][d.getDay()];
}
