"use client";

import type { TierBreakdownView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { formatHk, formatRoi, tierLabel } from "./format";

interface TierBreakdownCardProps {
  rows: TierBreakdownView[];
}

const TIER_DOT: Record<string, string> = {
  S: "bg-precision shadow-[0_0_4px_rgba(52,211,153,0.6)]",
  A: "bg-ai-start shadow-[0_0_4px_rgba(99,102,241,0.6)]",
  B: "bg-warning shadow-[0_0_4px_rgba(234,179,8,0.5)]",
  none: "bg-border-subtle",
};

export function TierBreakdownCard({ rows }: TierBreakdownCardProps) {
  const visibleRows = rows.filter((r) => r.tier !== "none");

  return (
    <div className="bento-card bento-card-hover p-5 md:p-6">
      <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
        Tier 分佈
      </h4>
      <p className="mt-0.5 text-[11px] text-text-subtle">
        S 最強信心 · A 標準 · B 降低注碼
      </p>

      {visibleRows.length === 0 ? (
        <EmptyMini hint="暫無分級資料" />
      ) : (
        <ul className="mt-4 space-y-2.5" aria-label="按 Tier 拆分">
          {visibleRows.map((r) => {
            const positive = r.pnl > 0;
            const negative = r.pnl < 0;
            const hitPct = r.judged > 0 ? (r.hit / r.judged) * 100 : 0;
            return (
              <li
                key={r.tier}
                className="rounded-lg border border-border-subtle bg-bg-subtle/30 p-2.5"
              >
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <TierDot tier={r.tier} />
                    {tierLabel(r.tier)}
                    <span className="text-text-subtle number-mono text-[10px]">
                      {r.races}
                    </span>
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Stat
                    label="ROI"
                    value={formatRoi(r.roi)}
                    valueClass={cn(
                      positive && "text-precision-glow",
                      negative && "text-danger",
                      !positive && !negative && "text-text-muted",
                    )}
                  />
                  <Stat
                    label="命中"
                    value={
                      r.judged > 0
                        ? `${hitPct.toFixed(0)}%`
                        : "—"
                    }
                    sub={`${r.hit}/${r.judged}`}
                  />
                  <Stat
                    label="盈虧"
                    value={formatHk(r.pnl, true)}
                    align="right"
                    valueClass={cn(
                      positive && "text-precision-glow",
                      negative && "text-danger",
                      !positive && !negative && "text-text-muted",
                    )}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TierDot({ tier }: { tier: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 rounded-sm",
        TIER_DOT[tier] ?? TIER_DOT.none,
      )}
    />
  );
}

function Stat({
  label,
  value,
  sub,
  valueClass,
  align = "left",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", align === "right" && "items-end")}>
      <span className="text-[9px] uppercase tracking-wider text-text-subtle">
        {label}
      </span>
      <span className={cn("number-mono text-[12px] font-bold", valueClass)}>
        {value}
      </span>
      {sub && (
        <span className="number-mono text-[9px] text-text-subtle">{sub}</span>
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
