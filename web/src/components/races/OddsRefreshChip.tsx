"use client";

import { AlertTriangle, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortTime } from "./utils";

interface OddsRefreshChipProps {
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  fetchedAt: string | null;
  onRefresh: () => void;
}

export function OddsRefreshChip({
  loading,
  error,
  lastUpdate,
  fetchedAt,
  onRefresh,
}: OddsRefreshChipProps) {
  const status = error
    ? { tone: "error" as const, label: "賠率更新失敗", icon: AlertTriangle }
    : lastUpdate
      ? { tone: "live" as const, label: `HKJC ${formatShortTime(lastUpdate)}`, icon: CheckCircle2 }
      : fetchedAt
        ? { tone: "ok" as const, label: `已取得 ${formatShortTime(fetchedAt)}`, icon: Clock }
        : { tone: "wait" as const, label: "等待中", icon: Clock };

  const StatusIcon = status.icon;

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-subtle px-2 py-1"
      aria-live="polite"
      aria-atomic="true"
    >
      <StatusIcon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          status.tone === "error" && "text-danger",
          status.tone === "live" && "text-precision",
          status.tone === "ok" && "text-text-muted",
          status.tone === "wait" && "text-text-subtle",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-wider text-text-subtle leading-none">
          即時賠率
        </div>
        <div
          className={cn(
            "truncate text-[10px] leading-tight",
            status.tone === "error" ? "text-danger" : "text-text-muted",
          )}
        >
          {status.label}
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        aria-label="刷新即時賠率"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-subtle bg-bg-card text-text-muted transition outline-none hover:border-border hover:text-text focus-visible:ring-2 focus-visible:ring-ai-start disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
      </button>
    </div>
  );
}
