"use client";

import { useState, useEffect, useCallback } from "react";

type Flow = "pre-prediction" | "results" | "post-prediction" | "history-rebuild";

interface AdminPanelProps {
  secret: string;
}

interface RunInfo {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  display_title?: string;
}

const VENUES = ["ST", "HV"];

const FLOW_LABELS: Record<Flow, string> = {
  "pre-prediction": "賽前預測",
  "results": "賽果 + 派彩",
  "post-prediction": "賽後重算",
  "history-rebuild": "全期重建",
};

const FLOW_DESC: Record<Flow, string> = {
  "pre-prediction": "賽日早上揀馬：抓 GraphQL → 跑 V19 → 匯出",
  "results": "賽後爬 HKJC：results / dividends / 聚合",
  "post-prediction": "賽後重算：用真實 results 重跑 V19 + actualTop3",
  "history-rebuild": "全期重建（罕用）：重新算所有歷史 V19",
};

function statusBadge(status: string, conclusion: string | null): { text: string; color: string } {
  if (status === "completed") {
    if (conclusion === "success") return { text: "成功", color: "text-emerald-400" };
    if (conclusion === "failure") return { text: "失敗", color: "text-red-400" };
    if (conclusion === "cancelled") return { text: "取消", color: "text-zinc-400" };
    return { text: conclusion || "已完成", color: "text-zinc-300" };
  }
  if (status === "in_progress") return { text: "執行中", color: "text-indigo-400" };
  if (status === "queued") return { text: "排隊中", color: "text-yellow-400" };
  return { text: status, color: "text-zinc-300" };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  return `${Math.floor(h / 24)} 天前`;
}

export function AdminPanel({ secret }: AdminPanelProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState("ST");
  const [races, setRaces] = useState("10");
  const [dispatching, setDispatching] = useState<Flow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunInfo[]>([]);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/run-status?limit=5", {
        headers: { "x-admin-secret": secret },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRuns(data.runs || []);
    } catch {
      // ignore
    }
  }, [secret]);

  useEffect(() => {
    fetchRuns();
    const hasInProgress = runs.some((r) => r.status !== "completed");
    const interval = setInterval(fetchRuns, hasInProgress ? 5000 : 15000);
    return () => clearInterval(interval);
  }, [fetchRuns, runs]);

  const dispatch = useCallback(
    async (flow: Flow) => {
      if (dispatching) return;
      setDispatching(flow);
      setError(null);
      try {
        const res = await fetch("/api/admin/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-secret": secret,
          },
          body: JSON.stringify({ flow, date, venue, races }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          setError(err.error || "Dispatch failed");
        } else {
          setTimeout(fetchRuns, 2000);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setDispatching(null);
      }
    },
    [dispatching, date, venue, races, secret, fetchRuns],
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Furlong Admin</h1>
          <p className="text-zinc-500 text-sm mt-1">
            觸發 GitHub Actions 跑 pipeline，完成後 Vercel 自動重新部署
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!!dispatching}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">場地</label>
              <select
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                disabled={!!dispatching}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 disabled:opacity-50"
              >
                {VENUES.map((v) => (
                  <option key={v} value={v}>
                    {v === "ST" ? "ST 沙田" : "HV 跑馬地"}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">場數</label>
              <input
                type="number"
                min={1}
                max={12}
                value={races}
                onChange={(e) => setRaces(e.target.value)}
                disabled={!!dispatching}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 w-20 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(FLOW_LABELS) as Flow[]).map((flow) => (
            <button
              key={flow}
              onClick={() => dispatch(flow)}
              disabled={!!dispatching}
              className={`text-left p-4 rounded-xl border transition-colors ${
                dispatching === flow
                  ? "bg-indigo-700 border-indigo-500 text-white"
                  : dispatching
                    ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed"
                    : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-indigo-600 text-zinc-100"
              }`}
            >
              <div className="font-medium text-sm flex items-center gap-2">
                {FLOW_LABELS[flow]}
                {dispatching === flow && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </div>
              <div className="text-xs text-zinc-500 mt-1">{FLOW_DESC[flow]}</div>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-sm text-red-300">
            <div className="font-medium mb-1">執行失敗</div>
            <div className="text-red-200">{error}</div>
            <div className="text-xs text-red-400 mt-2">
              如 HKJC 封 Actions IP，請本機跑：
              <code className="ml-1 bg-red-900 px-1.5 py-0.5 rounded">
                node update-results.js {date} {venue} {races}
              </code>
            </div>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
            <span className="text-xs text-zinc-400 font-medium">最近執行</span>
            <button onClick={fetchRuns} className="text-xs text-zinc-500 hover:text-zinc-300">
              重新整理
            </button>
          </div>
          <div className="divide-y divide-zinc-800">
            {runs.length === 0 ? (
              <div className="p-4 text-xs text-zinc-600">未有記錄</div>
            ) : (
              runs.map((r) => {
                const badge = statusBadge(r.status, r.conclusion);
                return (
                  <a
                    key={r.id}
                    href={r.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-200 truncate">
                        {r.display_title || `Run #${r.id}`}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {relativeTime(r.created_at)}
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${badge.color} shrink-0`}>
                      {badge.text}
                    </div>
                  </a>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
