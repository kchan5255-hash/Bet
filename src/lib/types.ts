export interface Features {
  recent: number;
  form: number;
  courseDistance: number;
  course: number;
  distance: number;
  class: number;
  going: number;
  rating: number;
  draw: number;
  weight: number;
  freshness: number;
  body: number;
  career: number;
  age: number;
}

export interface VeterinaryRecord {
  date: string;
  detail: string;
  passedOn: string;
  risk: number;
}

export interface Runner {
  no: string;
  name: string;
  englishName: string;
  code: string;
  draw: number;
  handicapWeight: number;
  bodyWeight: number;
  rating: number;
  last6run: string;
  jockey: string;
  trainer: string;
  age: string;
  careerStats: string;
  recordsCount: number;
  daysSinceLastRun: number | null;
  features: Features;
  veterinary?: VeterinaryRecord;
  rawScore: number;
  modelProbability: number;
  positives: string[];
  negatives: string[];
  winOdds?: number | null;
  placeOdds?: number | null;
}

export interface Race {
  raceNo: number;
  raceName: string;
  distance: number;
  className: string;
  going: string;
  course: string;
  postTime: string;
  runners: Runner[];
}

export type AnalysisResults = Race[];

export interface HistoryEntry {
  date: string;
  races: Race[];
}

export interface RaceResult {
  date: string;
  raceNo: number;
  actualTop3: string[];
}

export interface RunnerOdds {
  winOdds: number | null;
  placeOdds: number | null;
}

export interface RaceOdds {
  raceNo: number;
  odds: Record<string, RunnerOdds>;
  lastUpdate: string | null;
}

export interface OddsPayload {
  date: string;
  venueCode: string;
  scrapedAt: string;
  races: RaceOdds[];
}

export const POSITIVE_LABELS: Record<string, string> = {
  "recent-form": "近況不俗",
  "course-distance": "路程配合",
  "rating-edge": "評分優勢",
  "draw-edge": "檔位有利",
  "light-weight": "負磅較輕",
  freshness: "狀態活躍",
  "stable-body-weight": "體重穩定",
};

export const NEGATIVE_LABELS: Record<string, string> = {
  "weak-recent-form": "近況欠佳",
  "unproven-course-distance": "路程未驗",
  "low-rating": "評分偏低",
  "wide-or-bad-draw": "檔位欠佳",
  "heavy-weight": "負磅過重",
  "veterinary-record": "獸醫警示",
};
