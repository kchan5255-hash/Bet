"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Target, CheckCircle2, XCircle, Plus } from "lucide-react";
import {
  calcStats,
  calcTrend,
  getHistoryMeetings,
  getTopFourNos,
  isHit,
  loadResults,
  setRaceResult,
  runnerByNo,
  type HistoryMeeting,
  type MeetingResults,
} from "@/lib/history";
import type { Race } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PaywallOverlay } from "./PaywallOverlay";
import { useSubscription } from "@/lib/subscription";
import { formatMeetingDate } from "@/lib/data";

export function HistoryDashboard() {
  const { isPro, ready } = useSubscription();
  const meetings = useMemo(() => getHistoryMeetings(), []);
  const [store, setStore] = useState<Record<string, MeetingResults>>({});

  useEffect(() => {
    setStore(loadResults());
  }, []);

  const refresh = () => setStore(loadResults());

  const stats = useMemo(() => calcStats(meetings, store), [meetings, store]);
  const trend = useMemo(() => calcTrend(meetings, store), [meetings, store]);

  const body = (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          icon={<Target className="h-4 w-4 text-precision" />}
          label="整體命中率"
          value={`${(stats.hitRate * 100).toFixed(1)}%`}
          hint={`${stats.hitRaces} / ${stats.judgedRaces}`}
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          label="命中場次"
          value={String(stats.hitRaces)}
          hint="Top 4 命中頭三"
        />
        <StatTile
          icon={<TrendingUp className="h-4 w-4 text-upset-glow" />}
          label="已判定"
          value={String(stats.judgedRaces)}
          hint="已輸入賽果"
        />
        <StatTile
          icon={<XCircle className="h-4 w-4 text-text-muted" />}
          label="總場次"
          value={String(stats.totalRaces)}
          hint={`${meetings.length} 個賽馬日`}
        />
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elevated p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">
            命中率趨勢
          </h3>
          <p className="text-[11px] text-text-subtle mt-0.5">
            每個賽馬日的 Top 4 命中頭三名比率
          </p>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trend.length ? trend : placeholderTrend}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke="#64748B"
                fontSize={11}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#94A3B8" }}
                formatter={(v) => [`${Number(v).toFixed(1)}%`, "命中率"]}
              />
              <Line
                type="monotone"
                dataKey="hitRate"
                stroke="#8B5CF6"
                strokeWidth={2.5}
                dot={{ fill: "#8B5CF6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-5">
        {meetings.map((meeting) => (
          <MeetingBlock
            key={meeting.date}
            meeting={meeting}
            store={store}
            onChange={refresh}
          />
        ))}
      </div>
    </div>
  );

  if (!ready) {
    return <div className="h-64 animate-shimmer rounded-xl bg-bg-elevated" />;
  }

  if (!isPro) {
    return (
      <PaywallOverlay
        title="升級解鎖歷史記錄"
        description="Pro 訂閱可查看完整歷史命中率、趨勢圖表，並自行輸入賽果追蹤表現"
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

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-4">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[11px] text-text-muted">{label}</span>
      </div>
      <div className="number-mono text-2xl font-bold">{value}</div>
      {hint && (
        <div className="text-[10px] text-text-subtle mt-1">{hint}</div>
      )}
    </div>
  );
}

function MeetingBlock({
  meeting,
  store,
  onChange,
}: {
  meeting: HistoryMeeting;
  store: Record<string, MeetingResults>;
  onChange: () => void;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated overflow-hidden">
      <div className="border-b border-border-subtle px-5 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold">{formatMeetingDate(meeting.date)}</h3>
          <p className="text-[11px] text-text-subtle">
            {meeting.races.length} 場賽事
          </p>
        </div>
      </div>
      <div className="divide-y divide-border-subtle">
        {meeting.races.map((race) => (
          <RaceRow
            key={race.raceNo}
            date={meeting.date}
            race={race}
            actual={store[meeting.date]?.[race.raceNo] ?? []}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

function RaceRow({
  date,
  race,
  actual,
  onChange,
}: {
  date: string;
  race: Race;
  actual: string[];
  onChange: () => void;
}) {
  const topFour = getTopFourNos(race);
  const judged = actual.length > 0;
  const hit = judged && isHit(topFour, actual);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(actual.length ? actual : ["", "", ""]);

  const save = () => {
    const cleaned = draft.map((s) => s.trim()).filter(Boolean);
    setRaceResult(date, race.raceNo, cleaned);
    setEditing(false);
    onChange();
  };

  const reset = () => {
    setRaceResult(date, race.raceNo, []);
    setDraft(["", "", ""]);
    setEditing(false);
    onChange();
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="number-mono flex h-8 w-8 items-center justify-center rounded-md bg-bg-subtle text-xs font-bold">
            R{race.raceNo}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{race.raceName}</div>
            <div className="text-[11px] text-text-subtle">
              Top 4：
              {topFour.map((no, i) => {
                const r = runnerByNo(race, no);
                const isHitNo = actual.includes(no);
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
                    {r && (
                      <span className="text-text-muted"> {r.name}</span>
                    )}
                    {i < topFour.length - 1 && (
                      <span className="text-text-subtle"> · </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {judged ? (
            hit ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-precision/10 text-precision border border-precision/30 px-2 py-1 text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                命中
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 text-danger border border-danger/30 px-2 py-1 text-xs font-semibold">
                <XCircle className="h-3.5 w-3.5" />
                未中
              </span>
            )
          ) : (
            <span className="text-xs text-text-subtle">未輸入</span>
          )}
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-md border border-border bg-bg-subtle px-2.5 py-1 text-xs hover:border-text-muted transition"
          >
            {editing ? "取消" : judged ? "修改" : "輸入賽果"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 rounded-lg border border-border-subtle bg-bg-subtle p-3 animate-fade-in">
          <div className="text-[11px] text-text-muted mb-2 flex items-center gap-1">
            <Plus className="h-3 w-3" />
            輸入實際頭三名馬號
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                value={draft[i] ?? ""}
                onChange={(e) => {
                  const next = [...draft];
                  next[i] = e.target.value;
                  setDraft(next);
                }}
                placeholder={`第 ${i + 1} 名`}
                className="number-mono w-20 rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm focus:border-upset focus:outline-none"
              />
            ))}
            <button
              onClick={save}
              className="rounded-md ai-gradient px-3 py-1 text-xs font-semibold text-white"
            >
              儲存
            </button>
            {judged && (
              <button
                onClick={reset}
                className="text-xs text-text-subtle hover:text-danger transition"
              >
                清除
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
