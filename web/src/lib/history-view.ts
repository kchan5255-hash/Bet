import "server-only";

import {
  QIN_POOLS,
  calcMeetingPnl,
  calcMeetingPnlCross,
  calcOverallPnl,
  calcOverallPnlCross,
  calcRacePnl,
  calcRacePnlCross,
  calcStats,
  calcTrend,
  getHistoryMeetings,
  getTopPicks,
  isHit,
  isJudged,
  pickByNo,
} from "./history";
import type {
  HistoryDashboardData,
  HistoryMeetingView,
  HistoryPoolView,
  HistoryPnlSummaryView,
  HistoryRacePnlView,
  HistoryRaceView,
} from "./history-view-types";

function toPoolView(pool: {
  bets: number;
  stake: number;
  ret: number;
  pnl: number;
  wins: number;
  roi?: number;
}): HistoryPoolView {
  const roi = pool.roi ?? (pool.stake > 0 ? pool.pnl / pool.stake : 0);
  return {
    bets: pool.bets,
    stake: pool.stake,
    ret: pool.ret,
    pnl: pool.pnl,
    wins: pool.wins,
    roi,
  };
}

function toSummaryView(summary: {
  bets: number;
  stake: number;
  ret: number;
  pnl: number;
  roi: number;
  wins: number;
  judgedBets: number;
  byPool: Record<
    string,
    {
      bets: number;
      stake: number;
      ret: number;
      pnl: number;
      wins: number;
      roi: number;
    }
  >;
}): HistoryPnlSummaryView {
  return {
    bets: summary.bets,
    stake: summary.stake,
    ret: summary.ret,
    pnl: summary.pnl,
    roi: summary.roi,
    wins: summary.wins,
    judgedBets: summary.judgedBets,
    byPool: {
      qin: toPoolView(summary.byPool[QIN_POOLS[0]]),
      qinQ: toPoolView(summary.byPool[QIN_POOLS[1]]),
    },
  };
}

function toRacePnlView(racePnl: {
  hasBet: boolean;
  judged: boolean;
  bets: number;
  stake: number;
  ret: number;
  pnl: number;
  wins: number;
  byPool: Record<
    string,
    {
      bets: number;
      stake: number;
      ret: number;
      pnl: number;
      wins: number;
    }
  >;
}): HistoryRacePnlView {
  return {
    hasBet: racePnl.hasBet,
    judged: racePnl.judged,
    bets: racePnl.bets,
    stake: racePnl.stake,
    ret: racePnl.ret,
    pnl: racePnl.pnl,
    wins: racePnl.wins,
    byPool: {
      qin: toPoolView(racePnl.byPool[QIN_POOLS[0]]),
      qinQ: toPoolView(racePnl.byPool[QIN_POOLS[1]]),
    },
  };
}

function toRaceView(date: string, race: Parameters<typeof isJudged>[0]): HistoryRaceView {
  const topPicks = getTopPicks(race);
  const judged = isJudged(race);
  const hit = judged && isHit(topPicks, race.actualTop3);

  return {
    raceNo: race.raceNo,
    className: race.meta.className,
    distance: race.meta.distance ?? null,
    topPicks: topPicks.map((no) => ({
      no,
      name: pickByNo(race, no)?.name ?? "",
      isHit: race.actualTop3.includes(no),
    })),
    actualTop3: race.actualTop3,
    judged,
    hit,
    qinBankerLabels: race.recommend?.qinBanker?.map((entry) => entry.label) ?? [],
    bankerPnl: toRacePnlView(calcRacePnl(date, race)),
    crossPnl: toRacePnlView(calcRacePnlCross(date, race)),
  };
}

function toMeetingView(meeting: ReturnType<typeof getHistoryMeetings>[number]): HistoryMeetingView {
  let judged = 0;
  let hit = 0;

  const races = meeting.races.map((race) => {
    const raceView = toRaceView(meeting.date, race);
    if (raceView.judged) {
      judged += 1;
      if (raceView.hit) hit += 1;
    }
    return raceView;
  });

  return {
    date: meeting.date,
    venue: meeting.venue,
    raceCount: meeting.races.length,
    judged,
    hit,
    rate: judged > 0 ? (hit / judged) * 100 : 0,
    bankerPnl: toSummaryView(calcMeetingPnl(meeting)),
    crossPnl: toSummaryView(calcMeetingPnlCross(meeting)),
    races,
  };
}

export function getHistoryDashboardData(): HistoryDashboardData {
  const meetings = getHistoryMeetings();
  const stats = calcStats(meetings);

  return {
    generatedAt: new Date().toISOString(),
    meetingCount: meetings.length,
    stats: {
      totalRaces: stats.totalRaces,
      judgedRaces: stats.judgedRaces,
      hitRaces: stats.hitRaces,
      hitRate: stats.hitRate,
    },
    trend: calcTrend(meetings),
    bankerPnl: toSummaryView(calcOverallPnl(meetings)),
    crossPnl: toSummaryView(calcOverallPnlCross(meetings)),
    meetings: meetings.map(toMeetingView),
  };
}
