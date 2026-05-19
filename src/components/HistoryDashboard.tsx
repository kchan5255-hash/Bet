"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
  Cpu,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  calcStats,
  calcTrend,
  calcOverallPnl,
  calcOverallPnlCross,
  calcMeetingPnl,
  calcMeetingPnlCross,
  calcRacePnl,
  calcRacePnlCross,
  getHistoryMeetings,
  getTopPicks,
  isHit,
  isJudged,
  pickByNo,
  type HistoryMeeting,
  type V19Race,
} from "@/lib/history";
import { cn } from "@/lib/utils";
import { PaywallOverlay } from "./PaywallOverlay";
import { useSubscription } from "@/lib/subscription";
import { formatMeetingDate } from "@/lib/data";

export function HistoryDashboard() {
  const { isPro, ready } = useSubscription();
  const meetings = useMemo(() => getHistoryMeetings(), []);
  const stats = useMemo(() => calcStats(meetings), [meetings]);
  const trend = useMemo(() => calcTrend(meetings), [meetings]);
  const pnl = useMemo(() => calcOverallPnl(meetings), [meetings]);
  const pnlCross = useMemo(() => calcOverallPnlCross(meetings), [meetings]);
  const peak = useMemo(
    () => trend.reduce((m, p) => (p.hitRate > m ? p.hitRate : m), 0),
    [trend],
  );

  const hitPct = (stats.hitRate * 100).toFixed(1);
  const judgedPct = stats.totalRaces
    ? Math.round((stats.judgedRaces / stats.totalRaces) * 100)
    : 0;

  const body = (
    <div className="space-y-6 md:space-y-8">
      <HeroPanel
        hitPct={hitPct}
        hitRaces={stats.hitRaces}
        judgedRaces={stats.judgedRaces}
        totalRaces={stats.totalRaces}
        meetings={meetings.length}
        judgedPct={judgedPct}
        peak={peak}
      />

      <PnlPanel pnl={pnl} variant="banker" />
      <PnlPanel pnl={pnlCross} variant="cross" />

      <TrendCard trend={trend} />

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">
              逐日明細
            </h3>
            <p className="text-[11px] text-text-subtle mt-0.5">
              v19 模型 Top 3 推介 vs 實際頭三 · 自動判定
            </p>
          </div>
          <span className="text-[11px] text-text-subtle">
            {meetings.length} 個賽馬日
          </span>
        </div>
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <MeetingBlock key={meeting.date} meeting={meeting} />
          ))}
        </div>
      </section>
    </div>
  );

  if (!ready) {
    return <div className="h-64 animate-shimmer rounded-xl bg-bg-elevated" />;
  }

  if (!isPro) {
    return (
      <PaywallOverlay
        title="升級解鎖歷史記錄"
        description="Pro 訂閱可查看 v19 模型每場 Top 3 推介、命中率走勢與逐場判定"
        className="min-h-[600px]"
      >
        {body}
      </PaywallOverlay>
    );
  }

  return body;
}

const placeholderTrend = [
  { date: "2026-05-13", hitRate: 0, judged: 0, hit: 0 },
];

function HeroPanel({
  hitPct,
  hitRaces,
  judgedRaces,
  totalRaces,
  meetings,
  judgedPct,
  peak,
}: {
  hitPct: string;
  hitRaces: number;
  judgedRaces: number;
  totalRaces: number;
  meetings: number;
  judgedPct: number;
  peak: number;
}) {
  const ringPct = Math.min(100, parseFloat(hitPct) || 0);
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = (ringPct / 100) * c;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated">
      <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-upset/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-ai-start/15 blur-3xl pointer-events-none" />

      <div className="relative p-5 md:p-7">
        <div className="flex items-center gap-2 text-[10px] text-text-subtle uppercase tracking-[0.2em] mb-4">
          <span className="h-px w-6 bg-border" />
          Historical Performance
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-upset/30 bg-upset/10 px-2 py-0.5 text-upset-glow normal-case tracking-normal">
            <Cpu className="h-3 w-3" />
            v19 Model
          </span>
        </div>

        <div className="flex items-center gap-5 md:gap-8">
          <div className="relative flex-shrink-0">
            <svg
              viewBox="0 0 100 100"
              className="h-24 w-24 md:h-28 md:w-28 -rotate-90"
            >
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r={r}
                stroke="#1F2937"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r={r}
                stroke="url(#ringGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${dash} ${c}`}
                style={{
                  filter: "drop-shadow(0 0 6px rgba(139,92,246,0.55))",
                  transition: "stroke-dasharray 600ms ease",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="number-mono text-2xl md:text-3xl font-black leading-none">
                {hitPct}
              </span>
              <span className="text-[9px] text-text-subtle tracking-widest mt-1">
                HIT RATE
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-text-muted uppercase tracking-widest mb-1">
              Top 3 命中頭三
            </div>
            <h1 className="text-2xl md:text-3xl font-black leading-tight">
              <span className="ai-text-gradient">數據引擎</span> · 命中追蹤
            </h1>
            <p className="text-xs md:text-sm text-text-muted leading-relaxed mt-2 max-w-md">
              v19 模型每場 Top 3 推介 vs 實際頭三，自動同步、自動判定。
            </p>

            <div className="mt-4 flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-subtle px-2.5 py-1">
                <Trophy className="h-3 w-3 text-precision" />
                <span className="number-mono font-semibold">{hitRaces}</span>
                <span className="text-text-muted">命中</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-subtle px-2.5 py-1">
                <Activity className="h-3 w-3 text-upset-glow" />
                <span className="number-mono font-semibold">{judgedRaces}</span>
                <span className="text-text-muted">/{totalRaces}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 md:gap-3">
          <KpiPill
            label="峰值命中"
            value={`${peak.toFixed(0)}%`}
            accent="precision"
          />
          <KpiPill
            label="已判定"
            value={`${judgedPct}%`}
            sub={`${judgedRaces}/${totalRaces}`}
            accent="upset"
          />
          <KpiPill
            label="賽馬日"
            value={String(meetings)}
            sub="自 2026-05"
            accent="ai"
          />
        </div>
      </div>
    </section>
  );
}

function KpiPill({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "precision" | "upset" | "ai";
}) {
  const accentMap = {
    precision: "from-precision/20 to-transparent text-precision-glow",
    upset: "from-upset/25 to-transparent text-upset-glow",
    ai: "from-ai-start/25 to-transparent text-text",
  } as const;
  return (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-gradient-to-br p-3",
        accentMap[accent],
      )}
    >
      <div className="text-[10px] uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div className="number-mono text-lg md:text-xl font-bold mt-1 text-text">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-text-subtle mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function formatHk(amount: number, sign = false): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (!sign) return `$${formatted}`;
  if (amount > 0) return `+$${formatted}`;
  if (amount < 0) return `-$${formatted}`;
  return `$${formatted}`;
}

function PnlPanel({
  pnl,
  variant = "banker",
}: {
  pnl: ReturnType<typeof calcOverallPnl>;
  variant?: "banker" | "cross";
}) {
  const profit = pnl.pnl;
  const positive = profit > 0;
  const negative = profit < 0;
  const isCross = variant === "cross";
  const tagLabel = isCross
    ? "互穿 (T1-T2 / T1-T3 / T2-T3) · $100/注"
    : "膽拖 (T1-T2 / T1-T3) · $100/注";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated">
      <div
        className={cn(
          "absolute -top-20 -right-12 h-56 w-56 rounded-full blur-3xl pointer-events-none",
          positive && "bg-precision/25",
          negative && "bg-danger/20",
          !positive && !negative && "bg-upset/15",
        )}
      />
      <div className="relative p-5 md:p-6">
        <div className="flex items-center gap-2 text-[10px] text-text-subtle uppercase tracking-[0.2em] mb-4">
          <span className="h-px w-6 bg-border" />
          Profit & Loss
          <span className="ml-2 text-text-muted normal-case tracking-normal">{isCross ? "互穿" : "膽拖"}</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-subtle px-2 py-0.5 text-[10px] text-text-muted normal-case tracking-normal">
            <Wallet className="h-3 w-3" />
            {tagLabel}
          </span>
        </div>

        <div className="flex items-center gap-5 md:gap-8">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-text-muted uppercase tracking-widest mb-1">
              累計輸贏
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "number-mono text-3xl md:text-4xl font-black leading-none",
                  positive && "text-precision-glow",
                  negative && "text-danger",
                  !positive && !negative && "text-text",
                )}
              >
                {formatHk(profit, true)}
              </span>
              {positive && (
                <TrendingUp className="h-5 w-5 text-precision-glow" />
              )}
              {negative && (
                <TrendingDown className="h-5 w-5 text-danger" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
              <span>
                投注{" "}
                <span className="number-mono text-text">
                  {formatHk(pnl.stake)}
                </span>
              </span>
              <span className="text-text-subtle">·</span>
              <span>
                派彩{" "}
                <span className="number-mono text-text">
                  {formatHk(pnl.ret)}
                </span>
              </span>
              <span className="text-text-subtle">·</span>
              <span>
                中{" "}
                <span className="number-mono text-text">{pnl.wins}</span>/
                <span className="number-mono">{pnl.bets}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 md:gap-3">
          <RoiPill roi={pnl.roi} wins={pnl.wins} bets={pnl.bets} />
          <PoolPnlPill label="連贏" pool={pnl.byPool["連贏"]} />
          <PoolPnlPill label="位置Q" pool={pnl.byPool["位置Q"]} />
        </div>
      </div>
    </section>
  );
}

function RoiPill({
  roi,
  wins,
  bets,
}: {
  roi: number;
  wins: number;
  bets: number;
}) {
  const positive = roi > 0;
  const negative = roi < 0;
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        positive && "border-precision/40 bg-precision/10",
        negative && "border-danger/40 bg-danger/10",
        !positive && !negative && "border-border-subtle bg-bg-subtle",
      )}
    >
      <div className="text-[10px] uppercase tracking-widest text-text-muted">
        ROI
      </div>
      <div
        className={cn(
          "number-mono text-lg md:text-xl font-bold mt-1",
          positive && "text-precision-glow",
          negative && "text-danger",
          !positive && !negative && "text-text",
        )}
      >
        {roi >= 0 ? "+" : ""}
        {(roi * 100).toFixed(1)}%
      </div>
      <div className="text-[10px] text-text-muted mt-0.5 number-mono">
        {wins}/{bets} 中
      </div>
    </div>
  );
}

function PoolPnlPill({
  label,
  pool,
}: {
  label: string;
  pool: { bets: number; stake: number; ret: number; pnl: number; wins: number; roi: number };
}) {
  const positive = pool.pnl > 0;
  const negative = pool.pnl < 0;
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        positive && "border-precision/40 bg-precision/10",
        negative && "border-danger/40 bg-danger/10",
        !positive && !negative && "border-border-subtle bg-bg-subtle",
      )}
    >
      <div className="text-[10px] uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div
        className={cn(
          "number-mono text-lg md:text-xl font-bold mt-1",
          positive && "text-precision-glow",
          negative && "text-danger",
          !positive && !negative && "text-text",
        )}
      >
        {formatHk(pool.pnl, true)}
      </div>
      <div className="text-[10px] text-text-muted mt-0.5 number-mono">
        {pool.wins}/{pool.bets} · {pool.roi >= 0 ? "+" : ""}
        {(pool.roi * 100).toFixed(0)}%
      </div>
    </div>
  );
}


function TrendCard({ trend }: { trend: ReturnType<typeof calcTrend> }) {
  const data = trend.length ? trend : placeholderTrend;
  const last = data[data.length - 1];
  const lastPct = last?.hitRate ?? 0;

  return (
    <section className="rounded-2xl border border-border-subtle bg-bg-elevated p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-upset-glow" />
            命中率走勢
          </h3>
          <p className="text-[11px] text-text-subtle mt-0.5">
            每個賽馬日 Top 3 命中頭三比率
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-text-subtle">
            Latest
          </div>
          <div className="number-mono text-xl font-bold ai-text-gradient">
            {lastPct.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 6, right: 6, left: -8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#1F2937" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(15,23,42,0.95)",
                border: "1px solid #334155",
                borderRadius: 12,
                fontSize: 12,
                backdropFilter: "blur(8px)",
              }}
              labelStyle={{ color: "#94A3B8" }}
              formatter={(v) => [`${Number(v).toFixed(1)}%`, "命中率"]}
            />
            <Area
              type="monotone"
              dataKey="hitRate"
              stroke="url(#trendStroke)"
              strokeWidth={2.5}
              fill="url(#trendFill)"
              dot={{ fill: "#A78BFA", stroke: "#0F172A", strokeWidth: 2, r: 4 }}
              activeDot={{
                r: 6,
                fill: "#A78BFA",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function MeetingBlock({ meeting }: { meeting: HistoryMeeting }) {
  const meetingStats = useMemo(() => {
    let judged = 0;
    let hit = 0;
    meeting.races.forEach((race) => {
      if (!isJudged(race)) return;
      judged += 1;
      if (isHit(getTopPicks(race), race.actualTop3)) hit += 1;
    });
    return {
      judged,
      hit,
      rate: judged ? (hit / judged) * 100 : 0,
    };
  }, [meeting]);

  const meetingPnl = useMemo(() => calcMeetingPnl(meeting), [meeting]);
  const meetingPnlCross = useMemo(() => calcMeetingPnlCross(meeting), [meeting]);
  const hasBet = meetingPnl.bets > 0;
  const profit = meetingPnl.pnl;
  const positive = profit > 0;
  const negative = profit < 0;
  const profitCross = meetingPnlCross.pnl;
  const positiveCross = profitCross > 0;
  const negativeCross = profitCross < 0;

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-elevated overflow-hidden">
      <div className="border-b border-border-subtle px-4 md:px-5 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-sm md:text-base truncate">
            {formatMeetingDate(meeting.date)}
          </h3>
          <p className="text-[11px] text-text-subtle">
            {meeting.venue === "ST" ? "沙田" : "跑馬地"} · {meeting.races.length} 場 · 已判定 {meetingStats.judged}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasBet && (
            <>
              <div
                className={cn(
                  "flex flex-col items-end rounded-md border px-2 py-1",
                  positive && "border-precision/30 bg-precision/10",
                  negative && "border-danger/30 bg-danger/10",
                  !positive && !negative && "border-border-subtle bg-bg-subtle",
                )}
              >
                <span className="text-[9px] uppercase tracking-widest text-text-subtle leading-none">
                  膽拖
                </span>
                <span
                  className={cn(
                    "number-mono text-sm font-bold leading-tight",
                    positive && "text-precision",
                    negative && "text-danger",
                    !positive && !negative && "text-text-muted",
                  )}
                >
                  {formatHk(profit, true)}
                </span>
              </div>
              <div
                className={cn(
                  "flex flex-col items-end rounded-md border px-2 py-1",
                  positiveCross && "border-precision/30 bg-precision/10",
                  negativeCross && "border-danger/30 bg-danger/10",
                  !positiveCross && !negativeCross && "border-border-subtle bg-bg-subtle",
                )}
              >
                <span className="text-[9px] uppercase tracking-widest text-text-subtle leading-none">
                  互穿
                </span>
                <span
                  className={cn(
                    "number-mono text-sm font-bold leading-tight",
                    positiveCross && "text-precision",
                    negativeCross && "text-danger",
                    !positiveCross && !negativeCross && "text-text-muted",
                  )}
                >
                  {formatHk(profitCross, true)}
                </span>
              </div>
            </>
          )}
          {meetingStats.judged > 0 ? (
            <>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-text-subtle">
                  Hit Rate
                </div>
                <div className="number-mono text-base font-bold ai-text-gradient">
                  {meetingStats.rate.toFixed(0)}%
                </div>
              </div>
              <div className="number-mono rounded-md border border-precision/30 bg-precision/10 px-2 py-1 text-[11px] font-semibold text-precision">
                {meetingStats.hit}/{meetingStats.judged}
              </div>
            </>
          ) : (
            <span className="text-[11px] text-text-subtle">待開賽</span>
          )}
        </div>
      </div>
      <div className="divide-y divide-border-subtle">
        {meeting.races.map((race) => (
          <RaceRow key={race.raceNo} race={race} date={meeting.date} />
        ))}
      </div>
    </div>
  );
}

function RaceRow({ race, date }: { race: V19Race; date: string }) {
  const picks = getTopPicks(race);
  const judged = isJudged(race);
  const hit = judged && isHit(picks, race.actualTop3);
  const racePnl = useMemo(() => calcRacePnl(date, race), [date, race]);
  const racePnlCross = useMemo(() => calcRacePnlCross(date, race), [date, race]);
  const hasBet = racePnl.hasBet;
  const showPnl = hasBet && racePnl.judged;
  const profit = racePnl.pnl;
  const positive = profit > 0;
  const negative = profit < 0;
  const profitCross = racePnlCross.pnl;
  const positiveCross = profitCross > 0;
  const negativeCross = profitCross < 0;

  return (
    <div
      className={cn(
        "relative px-4 md:px-5 py-3 transition-colors",
        hasBet
          ? "bg-warning/[0.07] border-l-2 border-warning/70"
          : judged && hit
            ? "bg-precision/[0.04]"
            : judged && !hit
              ? "bg-danger/[0.03]"
              : "",
      )}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "number-mono flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold flex-shrink-0",
              hasBet
                ? "bg-warning/15 text-warning border border-warning/40"
                : judged && hit
                  ? "bg-precision/15 text-precision border border-precision/30"
                  : judged && !hit
                    ? "bg-danger/10 text-danger border border-danger/30"
                    : "bg-bg-subtle border border-border-subtle",
            )}
          >
            R{race.raceNo}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate text-sm">
              {race.meta.className} · {race.meta.distance}M
            </div>
            <div className="text-[11px] text-text-subtle leading-relaxed">
              <span className="text-text-muted">Top 3：</span>
              {picks.map((no, i) => {
                const p = pickByNo(race, no);
                const isHitNo = race.actualTop3.includes(no);
                return (
                  <span key={no}>
                    <span
                      className={cn(
                        "number-mono",
                        isHitNo && "text-precision font-semibold",
                      )}
                    >
                      {no}
                    </span>
                    {p && <span className="text-text-muted"> {p.name}</span>}
                    {i < picks.length - 1 && (
                      <span className="text-text-subtle"> · </span>
                    )}
                  </span>
                );
              })}
            </div>
            {racePnl.hasBet && (
              <div className="text-[11px] text-text-subtle leading-relaxed mt-0.5">
                <span className="text-text-muted">連贏+位置Q：</span>
                {race.recommend?.qinBanker?.map((b, i, arr) => (
                  <span key={b.combo} className="number-mono text-text-muted">
                    {b.label}
                    {i < arr.length - 1 && (
                      <span className="text-text-subtle"> · </span>
                    )}
                  </span>
                ))}
                <span className="text-text-subtle"> · 注 {racePnl.bets}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {judged ? (
            hit ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-precision/10 text-precision border border-precision/30 px-2 py-1 text-[11px] font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                命中
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 text-danger border border-danger/30 px-2 py-1 text-[11px] font-semibold">
                <XCircle className="h-3.5 w-3.5" />
                未中
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-subtle px-2 py-1 text-[11px] text-text-muted">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-upset opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-upset" />
              </span>
              待開賽
            </span>
          )}
          {judged && race.actualTop3.length > 0 && (
            <span className="number-mono inline-flex items-center gap-0.5 rounded-md border border-border-subtle bg-bg-subtle px-2 py-1 text-[11px] text-text-muted">
              <span className="text-text-subtle text-[10px]">頭三</span>
              {race.actualTop3.join("·")}
            </span>
          )}
        </div>
      </div>

      {showPnl && (
        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-border-subtle/60 bg-bg-subtle/50 px-3 py-2">
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-[9px] uppercase tracking-widest text-text-subtle">膽拖</span>
              <PoolLine label="連贏" pnl={racePnl.byPool["連贏"].pnl} />
              <span className="text-text-subtle">·</span>
              <PoolLine label="位Q" pnl={racePnl.byPool["位置Q"].pnl} />
            </div>
            <span
              className={cn(
                "number-mono inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold",
                positive && "bg-precision/20 text-precision-glow",
                negative && "bg-danger/20 text-danger",
                !positive && !negative && "bg-bg-subtle text-text-muted",
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : negative ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Wallet className="h-3 w-3" />
              )}
              合計 {formatHk(profit, true)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-border-subtle/60 bg-bg-subtle/50 px-3 py-2">
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-[9px] uppercase tracking-widest text-text-subtle">互穿</span>
              <PoolLine label="連贏" pnl={racePnlCross.byPool["連贏"].pnl} />
              <span className="text-text-subtle">·</span>
              <PoolLine label="位Q" pnl={racePnlCross.byPool["位置Q"].pnl} />
            </div>
            <span
              className={cn(
                "number-mono inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold",
                positiveCross && "bg-precision/20 text-precision-glow",
                negativeCross && "bg-danger/20 text-danger",
                !positiveCross && !negativeCross && "bg-bg-subtle text-text-muted",
              )}
            >
              {positiveCross ? (
                <TrendingUp className="h-3 w-3" />
              ) : negativeCross ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Wallet className="h-3 w-3" />
              )}
              合計 {formatHk(profitCross, true)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function PoolLine({ label, pnl }: { label: string; pnl: number }) {
  const positive = pnl > 0;
  const negative = pnl < 0;
  return (
    <span className="number-mono inline-flex items-baseline gap-1.5">
      <span className="text-text-muted">{label}</span>
      <span
        className={cn(
          "font-semibold",
          positive && "text-precision-glow",
          negative && "text-danger",
          !positive && !negative && "text-text-muted",
        )}
      >
        {formatHk(pnl, true)}
      </span>
    </span>
  );
}
