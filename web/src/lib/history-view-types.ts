export type HistoryPoolKey = "qin" | "qinQ";

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

export interface HistoryDashboardData {
  generatedAt: string;
  meetingCount: number;
  stats: HistoryStatsView;
  trend: HistoryTrendPointView[];
  bankerPnl: HistoryPnlSummaryView;
  crossPnl: HistoryPnlSummaryView;
  meetings: HistoryMeetingView[];
}
