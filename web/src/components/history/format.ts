import type { BetMode } from "@/lib/history-view-types";

export function formatHk(amount: number, sign = false): string {
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

export function formatHkCompact(amount: number, sign = false): string {
  const abs = Math.abs(amount);
  let body: string;
  if (abs >= 1_000_000) {
    body = `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  } else if (abs >= 1_000) {
    body = `${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  } else {
    body = abs.toFixed(0);
  }
  if (!sign) return `$${body}`;
  if (amount > 0) return `+$${body}`;
  if (amount < 0) return `-$${body}`;
  return `$${body}`;
}

export function formatRoi(roi: number): string {
  const pct = roi * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function pnlClass(pnl: number): string {
  if (pnl > 0) return "text-precision-glow";
  if (pnl < 0) return "text-danger";
  return "text-text-muted";
}

export function pnlBgClass(pnl: number): string {
  if (pnl > 0) return "bg-precision/15 text-precision-glow border-precision/30";
  if (pnl < 0) return "bg-danger/15 text-danger border-danger/30";
  return "bg-bg-subtle text-text-muted border-border-subtle";
}

export function strategyLabel(mode: BetMode): string {
  return mode === "banker" ? "膽拖" : "全串";
}

export function venueLabel(venue: string): string {
  if (venue === "ST") return "沙田";
  if (venue === "HV") return "跑馬地";
  return venue || "—";
}

export function tierLabel(tier: string): string {
  if (tier === "S") return "Tier S";
  if (tier === "A") return "Tier A";
  if (tier === "B") return "Tier B";
  return "未分級";
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  if (!y || !m) return month;
  return `${y} 年 ${Number(m)} 月`;
}
