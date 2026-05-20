import {
  formatPostTimeShort,
  weekdayLabel,
  type DateMeta,
} from "./meeting-utils";

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

export interface DividendRow {
  pool: string;
  combo: string;
  dividend: string;
}

export interface PoolGroup {
  pool: string;
  rows: DividendRow[];
}

export type VideoKind =
  | "replay"
  | "patrol"
  | "frontrunner"
  | "aerial"
  | "passthrough";

const VIDEO_LABELS: Record<VideoKind, string> = {
  replay: "賽事重播",
  patrol: "巡航視角",
  frontrunner: "頭馬追蹤",
  aerial: "航拍視角",
  passthrough: "過關片段",
};

const VIDEO_TYPE_PARAM: Record<VideoKind, string> = {
  replay: "replay-full",
  patrol: "replay-patrol",
  frontrunner: "replay-leading",
  aerial: "replay-drone",
  passthrough: "passthrough",
};

const VIDEO_HOST = "https://racing.hkjc.com";
const VIDEO_PATH = "/contentAsset/videoplayer_v4/video-player-iframe_v4.html";

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

export function videoLabel(kind: VideoKind): string {
  return VIDEO_LABELS[kind];
}

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

export { formatPostTimeShort, weekdayLabel };
export type { DateMeta };
