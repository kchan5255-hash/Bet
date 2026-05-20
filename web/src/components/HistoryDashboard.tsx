"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import type {
  HistoryDashboardData,
  HistoryMeetingView,
  HistoryPnlSummaryView,
  HistoryRaceView,
} from "@/lib/history-view-types";
import { formatMeetingDate } from "@/lib/meeting-utils";
import { cn } from "@/lib/utils";

interface HistoryDashboardProps {
  data: HistoryDashboardData;
}

const placeholderTrend = [
  { date: "2026-05-01", hitRate: 0, judged: 0, hit: 0 },
];

export function HistoryDashboard({ data }: HistoryDashboardProps) {
  const peak = data.trend.reduce(
    (max, point) => (point.hitRate > max ? point.hitRate : max),
    0,
  );
  const hitPct = (data.stats.hitRate * 100).toFixed(1);
  const judgedPct = data.stats.totalRaces
    ? Math.round((data.stats.judgedRaces / data.stats.totalRaces) * 100)
    : 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <HeroPanel
        hitPct={hitPct}
        hitRaces={data.stats.hitRaces}
        judgedRaces={data.stats.judgedRaces}
        totalRaces={data.stats.totalRaces}
        meetings={data.meetingCount}
        judgedPct={judgedPct}
        peak={peak}
      />

      <PnlPanel title="膽拖 P&L" pnl={data.bankerPnl} />
      <PnlPanel title="全串 P&L" pnl={data.crossPnl} />
      <TrendCard trend={data.trend} />

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">
              賽事回顧
            </h3>
            <p className="mt-0.5 text-[11px] text-text-subtle">
              V19 前三名預測、已判定賽果及連贏投注績效。
            </p>
          </div>
          <span className="text-[11px]">
            {data.meetingCount} 場賽事
          </span>
        </div>
        <div className="space-y-4">
          {data.meetings.map((meeting) => (
            <MeetingBlock key={meeting.date} meeting={meeting} />
          ))}
        </div>
      </section>
    </div>
  );
}

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
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dash = (ringPct / 100) * circumference;

  return (
    <section className="relative overflow-hidden bento-card">
      <div className="relative p-5 md:p-7">
        <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-text-subtle">
          <span className="h-px w-6 bg-border" />
          Historical Performance
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-upset/30 bg-upset/10 px-2 py-0.5 text-upset-glow normal-case tracking-normal">
            <Cpu className="h-3 w-3" />
            V19 模型
          </span>
        </div>

        <div className="flex items-center gap-5 md:gap-8">
          <div className="relative flex-shrink-0">
            <svg
              viewBox="0 0 100 100"
              className="h-24 w-24 -rotate-90 md:h-28 md:w-28"
            >
              <defs>
                <linearGradient id="history-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#1F2937"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="url(#history-ring)"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${dash} ${circumference}`}
                style={{
                  filter: "drop-shadow(0 0 6px rgba(139,92,246,0.55))",
                  transition: "stroke-dasharray 600ms ease",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="number-mono text-2xl font-black leading-none md:text-3xl">
                {hitPct}
              </span>
              <span className="mt-1 text-[9px] tracking-widest text-text-subtle">
              HIT RATE
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[11px] uppercase tracking-widest text-text-muted">
              V19 前三名預測
            </div>
            <h1 className="text-2xl font-black leading-tight md:text-3xl">
              歷史戰績回顧
            </h1>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-text-muted md:text-sm">
              V19 模型前三名預測、已判定賽事及連贏投注績效一覽。
            </p>

            <div className="mt-4 flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-subtle px-2.5 py-1">
                <Target className="h-3 w-3 text-precision" />
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
          <KpiPill label="最高命中率" value={`${peak.toFixed(0)}%`} accent="precision" />
          <KpiPill
            label="已判定覆蓋"
            value={`${judgedPct}%`}
            sub={`${judgedRaces}/${totalRaces}`}
            accent="upset"
          />
          <KpiPill label="賽事場數" value={String(meetings)} sub="已追蹤" accent="ai" />
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
        "rounded-xl border border-border-subtle bg-gradient-to-br p-3 bento-card-hover",
        accentMap[accent],
      )}
    >
      <div className="text-[10px] uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div className="mt-1 number-mono text-xl font-black text-text md:text-2xl">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-text-subtle">{sub}</div>}
    </div>
  );
}

function PnlPanel({
  title,
  pnl,
}: {
  title: string;
  pnl: HistoryPnlSummaryView;
}) {
  const positive = pnl.pnl > 0;
  const negative = pnl.pnl < 0;

  return (
    <section className="bento-card p-5 md:p-6">
      <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-text-subtle">
        <span className="h-px w-6 bg-border" />
        {title}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-text-muted">
            淨盈虧
          </div>
          <div
            className={cn(
              "mt-1 number-mono text-3xl font-black leading-none md:text-4xl",
              positive && "text-precision-glow",
              negative && "text-danger",
              !positive && !negative && "text-text",
            )}
          >
            {formatHk(pnl.pnl, true)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
            <span>
              投注額 <span className="number-mono text-text">{formatHk(pnl.stake)}</span>
            </span>
            <span className="text-text-subtle">·</span>
            <span>
              回報 <span className="number-mono text-text">{formatHk(pnl.ret)}</span>
            </span>
            <span className="text-text-subtle">·</span>
            <span>
              勝出 <span className="number-mono text-text">{pnl.wins}</span>/
              <span className="number-mono">{pnl.bets}</span>
            </span>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <MetricCard label="ROI" value={`${pnl.roi >= 0 ? "+" : ""}${(pnl.roi * 100).toFixed(1)}%`} />
          <MetricCard label="連贏" value={formatHk(pnl.byPool.qin.pnl, true)} />
          <MetricCard label="位置Q" value={formatHk(pnl.byPool.qinQ.pnl, true)} />
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card px-3 py-2.5 bento-card-hover min-w-0">
      <div className="text-[9px] uppercase tracking-widest text-text-muted whitespace-nowrap">{label}</div>
      <div className="mt-1 number-mono text-sm font-bold text-text whitespace-nowrap">
        {value}
      </div>
    </div>
  );
}

function TrendCard({ trend }: { trend: HistoryDashboardData["trend"] }) {
  const data = trend.length ? trend : placeholderTrend;
  const latest = data[data.length - 1];

  return (
    <section className="bento-card p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-text-muted">
            <Sparkles className="h-3.5 w-3.5 text-upset-glow" />
            走勢
          </h3>
          <p className="mt-0.5 text-[11px] text-text-subtle">
            各場賽事命中率走勢。
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-text-subtle">最新</div>
          <div className="number-mono text-xl font-bold ai-text-gradient">
            {latest?.hitRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={224}>
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="history-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="history-trend-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1F2937" strokeDasharray="2 4" />
            <XAxis
              dataKey="date"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#1F2937" }}
              tickFormatter={(value) => value.slice(5)}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
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
              formatter={(value) => [`${Number(value).toFixed(1)}%`, "命中率"]}
            />
            <Area
              type="monotone"
              dataKey="hitRate"
              stroke="url(#history-trend-stroke)"
              strokeWidth={2.5}
              fill="url(#history-trend-fill)"
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

function MeetingBlock({ meeting }: { meeting: HistoryMeetingView }) {
  const positive = meeting.bankerPnl.pnl > 0;
  const negative = meeting.bankerPnl.pnl < 0;
  const positiveCross = meeting.crossPnl.pnl > 0;
  const negativeCross = meeting.crossPnl.pnl < 0;

  return (
    <div className="overflow-hidden bento-card bento-card-hover">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 md:px-5">
        <div className="min-w-0 border-l-2 border-precision/40 pl-3">
          <h3 className="truncate text-sm font-bold md:text-base">
            {formatMeetingDate(meeting.date)}
          </h3>
          <p className="text-[11px] text-text-subtle">
            {meeting.venue} · {meeting.raceCount} 場 · 已判定 {meeting.judged}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PnlBadge
            label="膽拖"
            value={formatHk(meeting.bankerPnl.pnl, true)}
            positive={positive}
            negative={negative}
          />
          <PnlBadge
            label="全串"
            value={formatHk(meeting.crossPnl.pnl, true)}
            positive={positiveCross}
            negative={negativeCross}
          />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-text-subtle">命中率</div>
            <div className="number-mono text-base font-bold ai-text-gradient">
              {meeting.rate.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border-subtle">
        {meeting.races.map((race) => (
          <RaceRow key={`${meeting.date}-${race.raceNo}`} race={race} />
        ))}
      </div>
    </div>
  );
}

function PnlBadge({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive: boolean;
  negative: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-end rounded-md border px-2 py-1",
        positive && "border-precision/30 bg-precision/10",
        negative && "border-danger/30 bg-danger/10",
        !positive && !negative && "border-border-subtle bg-bg-subtle",
      )}
    >
      <span className="text-[9px] uppercase tracking-widest text-text-subtle leading-none">
        {label}
      </span>
      <span
        className={cn(
          "number-mono text-sm font-bold leading-tight",
          positive && "text-precision",
          negative && "text-danger",
          !positive && !negative && "text-text-muted",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RaceRow({ race }: { race: HistoryRaceView }) {
  const bankerPositive = race.bankerPnl.pnl > 0;
  const bankerNegative = race.bankerPnl.pnl < 0;
  const crossPositive = race.crossPnl.pnl > 0;
  const crossNegative = race.crossPnl.pnl < 0;

  return (
    <div
      className={cn(
        "relative px-4 py-3 transition-colors hover:bg-bg-elevated/50 md:px-5",
        race.bankerPnl.hasBet
          ? "border-l-2 border-warning/70 bg-warning/[0.07]"
          : race.judged && race.hit
            ? "bg-precision/[0.04]"
            : race.judged && !race.hit
              ? "bg-danger/[0.03]"
              : "",
      )}
    >
      {/* 主行：場次號 + 賽事資訊 + 右側狀態 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          {/* 場次號徽章 */}
          <div
            className={cn(
              "number-mono flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold",
              race.bankerPnl.hasBet
                ? "border border-warning/40 bg-warning/15 text-warning"
                : race.judged && race.hit
                  ? "border border-precision/30 bg-precision/15 text-precision"
                  : race.judged && !race.hit
                    ? "border border-danger/30 bg-danger/10 text-danger"
                    : "border border-border-subtle bg-bg-subtle text-text-muted",
            )}
          >
            R{race.raceNo}
          </div>

          {/* 賽事資訊 */}
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">
              {race.className}
              {race.distance !== null ? ` · ${race.distance}m` : ""}
            </div>
            <div className="mt-0.5 text-[11px] text-text-subtle">
              前三名：{" "}
              {race.topPicks.map((pick, index) => (
                <span key={pick.no}>
                  <span className={cn("number-mono", pick.isHit && "font-semibold text-precision")}>
                    {pick.no}
                  </span>
                  {pick.name ? <span className="text-text-muted"> {pick.name}</span> : null}
                  {index < race.topPicks.length - 1 ? <span className="text-text-subtle"> · </span> : null}
                </span>
              ))}
            </div>
            {race.qinBankerLabels.length > 0 && (
              <div className="mt-0.5 text-[11px] text-text-subtle">
                膽拖：{" "}
                {race.qinBankerLabels.map((label, index) => (
                  <span key={label} className="number-mono text-text-muted">
                    {label}
                    {index < race.qinBankerLabels.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右側：命中狀態 + 實際結果（同行） */}
        <div className="flex shrink-0 items-center gap-1.5">
          {race.judged ? (
            race.hit ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-precision/30 bg-precision/10 px-2 py-1 text-[11px] font-semibold text-precision">
                <CheckCircle2 className="h-3 w-3" />
                命中
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
                <XCircle className="h-3 w-3" />
                未中
              </span>
            )
          ) : (
            <span className="inline-flex items-center rounded-md border border-border-subtle bg-bg-subtle px-2 py-1 text-[11px] text-text-muted">
              待定
            </span>
          )}
          {race.actualTop3.length > 0 && (
            <span className="number-mono inline-flex items-center rounded-md border border-border-subtle bg-bg-subtle px-2 py-1 text-[11px] text-text-muted">
              實際 {race.actualTop3.join("-")}
            </span>
          )}
        </div>
      </div>

      {/* P&L 行 */}
      {race.bankerPnl.hasBet && race.bankerPnl.judged && (
        <div className="mt-2.5 space-y-1.5">
          <PnlRow
            label="膽拖"
            qinPnl={race.bankerPnl.byPool.qin.pnl}
            qinQPnl={race.bankerPnl.byPool.qinQ.pnl}
            totalPnl={race.bankerPnl.pnl}
            positive={bankerPositive}
            negative={bankerNegative}
          />
          <PnlRow
            label="全串"
            qinPnl={race.crossPnl.byPool.qin.pnl}
            qinQPnl={race.crossPnl.byPool.qinQ.pnl}
            totalPnl={race.crossPnl.pnl}
            positive={crossPositive}
            negative={crossNegative}
          />
        </div>
      )}
    </div>
  );
}

function PnlRow({
  label,
  qinPnl,
  qinQPnl,
  totalPnl,
  positive,
  negative,
}: {
  label: string;
  qinPnl: number;
  qinQPnl: number;
  totalPnl: number;
  positive: boolean;
  negative: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle/60 bg-bg-subtle/50 px-3 py-2">
      <div className="flex items-center gap-3 text-[11px]">
        <span className="text-[9px] uppercase tracking-widest text-text-subtle">{label}</span>
        <PoolLine label="連贏" pnl={qinPnl} />
        <span className="text-text-subtle">·</span>
        <PoolLine label="位置Q" pnl={qinQPnl} />
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
        {formatHk(totalPnl, true)}
      </span>
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
