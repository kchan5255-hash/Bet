import "server-only";

import fs from "fs";
import path from "path";
import { applyProfessionalModel } from "./professional-model";
import { getV19Entry } from "./v19-model";
import type { AnalysisResults, Runner } from "./types";

const DATA_DIR = path.join(process.cwd(), "src", "data");

// mtime-based cache：檔案未變動時直接回傳 cache，變動後自動重新讀取
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

function getResultsByDate(): ResultsByDate {
  return readJson("race-results-by-date.json");
}

function getDividendsByDate(): DividendsByDate {
  return readJson("dividends-by-date.json");
}

function getAnalysisByDate() {
  return readJson<AnalysisByDate>("analysis-by-date.json");
}

function getV9Results() {
  return readJson<{ byDate: Record<string, { races: { raceNo: number; runners: { no: string; rawScore: number; modelProbability: number }[] }[] }> }>("v9-results.json");
}

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

export interface DateMeta {
  date: string;
  venue: string;
  venueName: string;
  raceCount: number;
}

interface ResultsByDate {
  dates: DateMeta[];
  byDate: Record<string, ResultsPayload>;
}

interface DividendsByDate {
  dates: string[];
  byDate: Record<
    string,
    {
      date: string;
      venue: string;
      venueName: string;
      races: { raceNo: number; dividends: DividendRow[] }[];
    }
  >;
}

export function getMeetingDates(): DateMeta[] {
  return getResultsByDate().dates;
}

export function getLatestMeetingDate(): string {
  const dates = getResultsByDate().dates;
  return dates[dates.length - 1]?.date ?? "";
}

export function getResults(date?: string): ResultsPayload {
  const RESULTS = getResultsByDate();
  const target = date ?? getLatestMeetingDate();
  const payload = RESULTS.byDate[target];
  if (!payload) {
    return {
      date: target,
      venue: "",
      venueName: "",
      scrapedAt: "",
      races: [],
    };
  }
  return payload;
}

export function getResultRace(
  date: string,
  raceNo: number,
): ResultRace | undefined {
  return getResults(date).races.find((r) => r.raceNo === raceNo);
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

export interface DividendRow {
  pool: string;
  combo: string;
  dividend: string;
}

export function getDividends(date: string, raceNo: number): DividendRow[] {
  const day = getDividendsByDate().byDate[date];
  if (!day) return [];
  const entry = day.races.find((r) => r.raceNo === raceNo);
  if (!entry) return [];

  // dividends-by-date.json 格式: { pool: [{ combo, amount }] }
  // 轉換成 DividendRow[]: [{ pool, combo, dividend }]
  const raw = entry.dividends as unknown as Record<string, { combo: string; amount: number }[]>;
  if (Array.isArray(raw)) return raw as unknown as DividendRow[];

  const rows: DividendRow[] = [];
  for (const [pool, entries] of Object.entries(raw)) {
    for (const e of entries) {
      rows.push({ pool, combo: e.combo, dividend: String(e.amount) });
    }
  }
  return rows;
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
  if (!rows || !Array.isArray(rows)) return [];
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

export type ResultModel = "pro" | "v9" | "v19";

interface V9RunnerEntry {
  no: string;
  rank: number;
  rawScore: number;
  modelProbability: number;
}

interface V9RaceEntry {
  raceNo: number;
  runners: V9RunnerEntry[];
}

interface V9DayEntry {
  date: string;
  venue: string;
  races: V9RaceEntry[];
}

interface V9Payload {
  dates: string[];
  byDate: Record<string, V9DayEntry>;
}

interface AnalysisByDate {
  dates: { date: string }[];
  byDate: Record<string, AnalysisResults>;
}

export function getModelRanking(
  date: string,
  raceNo: number,
  model: ResultModel = "pro",
): Map<string, number> {
  const map = new Map<string, number>();

  if (model === "v9") {
    const day = getV9Results().byDate?.[date];
    if (!day) return map;
    const race = day.races.find((r) => r.raceNo === raceNo);
    if (!race) return map;
    const sorted = [...race.runners].sort(
      (a, b) => b.modelProbability - a.modelProbability,
    );
    sorted.forEach((r, idx) => {
      map.set(String(r.no), idx + 1);
    });
    return map;
  }

  if (model === "v19") {
    const entry = getV19Entry(date, raceNo);
    if (!entry) return map;
    const sorted = [...entry.proTop3].sort((a, b) => b.prob - a.prob);
    sorted.forEach((r, idx) => {
      map.set(String(r.no), idx + 1);
    });
    return map;
  }

  const dayRaces = (getAnalysisByDate() as AnalysisByDate).byDate?.[date];
  if (!dayRaces) return map;
  const baseRace = dayRaces.find((r) => r.raceNo === raceNo);
  if (!baseRace) return map;
  const proRace = applyProfessionalModel(baseRace);
  const sorted = [...proRace.runners].sort(
    (a: Runner, b: Runner) => b.modelProbability - a.modelProbability,
  );
  sorted.forEach((r, idx) => {
    map.set(r.no, idx + 1);
  });
  return map;
}

export function getRunnerScores(
  date: string,
  raceNo: number,
  model: ResultModel = "pro",
): Map<string, number> {
  const map = new Map<string, number>();

  if (model === "v9") {
    const day = getV9Results().byDate?.[date];
    if (!day) return map;
    const race = day.races.find((r) => r.raceNo === raceNo);
    if (!race) return map;
    for (const r of race.runners) {
      map.set(String(r.no), Math.round(r.rawScore * 100));
    }
    return map;
  }

  if (model === "v19") {
    const entry = getV19Entry(date, raceNo);
    if (!entry) return map;
    for (const t of entry.proTop3) {
      map.set(String(t.no), Math.round(t.prob * 10) / 10);
    }
    return map;
  }

  const dayRaces = (getAnalysisByDate() as AnalysisByDate).byDate?.[date];
  if (!dayRaces) return map;
  const baseRace = dayRaces.find((r) => r.raceNo === raceNo);
  if (!baseRace) return map;
  const proRace = applyProfessionalModel(baseRace);
  for (const r of proRace.runners) {
    map.set(r.no, Math.round(r.rawScore * 100));
  }
  return map;
}
