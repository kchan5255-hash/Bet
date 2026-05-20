"use client";

import { useState, useRef, useCallback } from "react";

type Flow = "results" | "history" | "prediction" | "scheduler";

interface AdminPanelProps {
  secret: string;
}

const VENUES = ["ST", "HV"];

export function AdminPanel({ secret }: AdminPanelProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState("ST");
  const [races, setRaces] = useState("10");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const appendLog = useCallback((line: string) => {
    setLogs((prev) => [...prev, line]);
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 0);
  }, []);

  const runFlow = useCallback(
    async (flow: Flow) => {
      if (running) return;
      setRunning(true);
      setLogs([]);

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
          appendLog(`✗ 錯誤：${err.error ?? res.statusText}`);
          setRunning(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          appendLog("✗ 無法讀取串流");
          setRunning(false);
          return;
        }

        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.replace(/^data: /, "").trim();
            if (line) {
              try {
                appendLog(JSON.parse(line));
              } catch {
                appendLog(line);
              }
            }
          }
        }
      } catch (e) {
        appendLog(`✗ 網路錯誤：${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setRunning(false);
      }
    },
    [running, date, venue, races, secret, appendLog],
  );

  const btnClass = (disabled: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      disabled
        ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
        : "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
    }`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Furlong Admin</h1>
          <p className="text-zinc-500 text-sm mt-1">資料更新控制台</p>
        </div>

        {/* Controls */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={running}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">場地</label>
              <select
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                disabled={running}
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
                disabled={running}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 w-20 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => runFlow("results")}
              disabled={running}
              className={btnClass(running)}
            >
              賽果 + 派彩更新
            </button>
            <button
              onClick={() => runFlow("history")}
              disabled={running}
              className={btnClass(running)}
            >
              歷史記錄更新
            </button>
            <button
              onClick={() => runFlow("prediction")}
              disabled={running}
              className={btnClass(running)}
            >
              勝率預測更新
            </button>
            <button
              onClick={() => runFlow("scheduler")}
              disabled={running}
              className={btnClass(running)}
            >
              啟動逐場排程
            </button>
          </div>
        </div>

        {/* Log panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
            <span className="text-xs text-zinc-400 font-medium">執行 Log</span>
            {running && (
              <span className="flex items-center gap-1.5 text-xs text-indigo-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                執行中...
              </span>
            )}
            {!running && logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                清除
              </button>
            )}
          </div>
          <div
            ref={logRef}
            className="h-72 overflow-y-auto p-4 font-mono text-xs text-zinc-300 space-y-0.5"
          >
            {logs.length === 0 ? (
              <span className="text-zinc-600">點擊上方按鈕開始執行...</span>
            ) : (
              logs.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("✓")
                      ? "text-emerald-400"
                      : line.startsWith("✗") || line.includes("[err]")
                        ? "text-red-400"
                        : line.startsWith("完成")
                          ? "text-emerald-300 font-semibold"
                          : "text-zinc-300"
                  }
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
