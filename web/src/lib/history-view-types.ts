export type HistoryPoolKey = "qin" | "qinQ";

export type BetMode = "banker" | "cross";

export type TierKey = "S" | "A" | "B" | "none";

export interface HistoryPoolView {
  bets: number;
  stake: number;
  ret: number;
  pnl: number;
  wins: number;
  roi: number;
}

export interface HistoryPnlSummaryView {
  bets: number;
  stake: number;
  ret: number;
  pnl: number;
  roi: number;
  wins: number;
  judgedBets: number;
  byPool: Record<HistoryPoolKey, HistoryPoolView>;
}

export interface HistoryRacePnlView {
  hasBet: boolean;
  judged: boolean;
  bets: number;
  stake: number;
  ret: number;
  pnl: number;
  wins: number;
  byPool: Record<HistoryPoolKey, HistoryPoolView>;
}

export interface HistoryTopPickView {
  no: string;
  name: string;
  isHit: boolean;
}

export interface HistoryRaceView {
  raceNo: number;
  className: string;
  distance: number | null;
  tier: TierKey;
  topPicks: HistoryTopPickView[];
  actualTop3: string[];
  judged: boolean;
  hit: boolean;
  qinBankerLabels: string[];
  bankerPnl: HistoryRacePnlView;
  crossPnl: HistoryRacePnlView;
}

export interface HistoryMeetingView {
  date: string;
  venue: string;
  raceCount: number;
  judged: number;
  hit: number;
  rate: number;
  bankerPnl: HistoryPnlSummaryView;
  crossPnl: HistoryPnlSummaryView;
  races: HistoryRaceView[];
}

export interface HistoryStatsView {
  totalRaces: number;
  judgedRaces: number;
  hitRaces: number;
  hitRate: number;
}

export interface HistoryTrendPointView {
  date: string;
  hitRate: number;
  judged: number;
  hit: number;
}

export interface EquityPointView {
  date: string;
  cumPnl: number;
  dailyPnl: number;
  hitRate: number;
  judged: number;
  hit: number;
  bets: number;
}

export interface EquityCurveSetView {
  banker: EquityPointView[];
  cross: EquityPointView[];
}

export interface VenueBreakdownView {
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

export interface DistanceBreakdownView {
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

export interface TierBreakdownView {
  tier: TierKey;
  races: number;
  judged: number;
  hit: number;
  rate: number;
  bets: number;
  stake: number;
  pnl: number;
  roi: number;
}

export interface PoolBreakdownView {
  qin: HistoryPoolView;
  qinQ: HistoryPoolView;
}

export interface HistoryBreakdownView {
  byVenue: VenueBreakdownView[];
  byDistance: DistanceBreakdownView[];
  byTier: TierBreakdownView[];
  byPool: PoolBreakdownView;
}

export interface StreakInfoView {
  longestWin: number;
  longestLoss: number;
  currentType: "win" | "loss" | "none";
  currentLen: number;
}

export interface RiskMetricsView {
  maxDrawdown: number;
  maxDrawdownPct: number;
  profitFactor: number;
  streaks: StreakInfoView;
}

export interface HistoryDashboardData {
  generatedAt: string;
  meetingCount: number;
  stats: HistoryStatsView;
  trend: HistoryTrendPointView[];
  bankerPnl: HistoryPnlSummaryView;
  crossPnl: HistoryPnlSummaryView;
  meetings: HistoryMeetingView[];
  equity: EquityCurveSetView;
  breakdown: {
    banker: HistoryBreakdownView;
    cross: HistoryBreakdownView;
  };
  risk: {
    banker: RiskMetricsView;
    cross: RiskMetricsView;
  };
}
