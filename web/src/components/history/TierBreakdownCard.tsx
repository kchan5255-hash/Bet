"use client";

import type { TierBreakdownView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { formatRoi, tierLabel } from "./format";

interface TierBreakdownCardProps {
  rows: TierBreakdownView[];
}

const TIER_ACCENT: Record<string, string> = {
  S: "from-precision/40 to-precision/10 border-precision/30 text-precision-glow",
  A: "from-ai-start/40 to-ai-start/10 border-ai-start/30 text-text",
  B: "from-warning/30 to-warning/5 border-warning/30 text-warning",
  none: "from-border/40 to-transparent border-border-subtle text-text-muted",
};

export function TierBreakdownCard({ rows }: TierBreakdownCardProps) {
  const maxRaces = rows.reduce((m, r) => Math.max(m, r.races), 0) || 1;

  return (
    <div className="bento-card bento-card-hover p-5 md:p-6">
      <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
        Tier 分佈
      </h4>
      <p className="mt-0.5 text-[11px] text-text-subtle">
        S 最強信心 · A 標準 · B 降低注碼
      </p>

      {rows.length === 0 ? (
        <EmptyMini hint="暫無分級資料" />
      ) : (
        <ul className="mt-4 space-y-3" aria-label="按 Tier 拆分">
          {rows.map((r) => {
            const widthPct = (r.races / maxRaces) * 100;
            const hitPct = r.judged > 0 ? (r.hit / r.judged) * 100 : 0;
            return (
              <li key={r.tier} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border bg-gradient-to-r px-2 py-0.5 font-semibold",
                      TIER_ACCENT[r.tier],
                    )}
                  >
                    {tierLabel(r.tier)}
                    <span className="number-mono text-[10px] opacity-80">
                      {r.races}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "number-mono text-[11px] font-bold",
                      r.pnl > 0 && "text-precision-glow",
                      r.pnl < 0 && "text-danger",
                      r.pnl === 0 && "text-text-muted",
                    )}
                  >
                    {formatRoi(r.roi)}
                  </span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className="absolute inset-y-0 left-0 bg-precision/60"
                    style={{ width: `${(widthPct * hitPct) / 100}%` }}
                    aria-hidden
                  />
                  <div
                    className="absolute inset-y-0 bg-danger/40"
                    style={{
                      left: `${(widthPct * hitPct) / 100}%`,
                      width: `${widthPct - (widthPct * hitPct) / 100}%`,
                    }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-subtle">
                  <span className="number-mono">
                    命中 {r.hit}/{r.judged}
                    {r.judged > 0 ? ` · ${hitPct.toFixed(0)}%` : ""}
                  </span>
                  <span className="number-mono">
                    投注 {r.bets}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyMini({ hint }: { hint: string }) {
  return (
    <div className="mt-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-border-subtle text-[11px] text-text-subtle">
      {hint}
    </div>
  );
}
