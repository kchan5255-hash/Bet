export type RaceModelKey = "pro" | "v9" | "v19";

export interface RaceRunnerView {
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
  sex?: string;
  rawScore: number;
  modelProbability: number;
  winOdds?: number | null;
  placeOdds?: number | null;
  gearInfo?: string;
  allowance?: string;
  trainerPreference?: number;
  trumpCard?: boolean;
  priority?: boolean;
}

export interface RaceView {
  raceNo: number;
  raceName: string;
  distance: number;
  className: string;
  going: string;
  course: string;
  postTime: string;
  runners: RaceRunnerView[];
}

export interface RaceCardMeta {
  raceNo: number;
  raceName: string;
  distance: number;
  className: string;
  going: string;
  course: string;
  postTime: string;
}

export interface V19BannerView {
  fieldSize: number | null;
  gate: {
    action: "play" | "skip";
    tier: "S" | "A" | "B" | null;
    reason: string | null;
    reasons: string[];
    draw: number | null;
    class: number | null;
    boost: string | null;
  };
  recommend: {
    tier: "S" | "A" | "B";
    qinT12: { combo: string; label: string };
    qinBanker: { combo: string; label: string }[];
    stakeMul: number;
    boost?: string | null;
  } | null;
}

export interface RaceViewerPayload {
  date: string;
  cards: RaceCardMeta[];
  models: {
    pro: RaceView[];
    v9: RaceView[];
    v19?: RaceView[];
  };
  v19Available: boolean;
  v19Banners: Record<string, V19BannerView | null>;
}
