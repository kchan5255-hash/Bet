"use client";

import type { VenueBreakdownView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { formatHk, formatRoi, venueLabel } from "./format";

interface VenueBreakdownCardProps {
  rows: VenueBreakdownView[];
}

const HV_STRIPE_BG =
  "repeating-linear-gradient(45deg, #8b5cf6 0, #8b5cf6 6px, rgba(139,92,246,0.35) 6px, rgba(139,92,246,0.35) 12px)";

export function VenueBreakdownCard({ rows }: VenueBreakdownCardProps) {
  const maxRaces = rows.reduce((m, r) => Math.max(m, r.races), 0) || 1;

  return (
    <div className="bento-card bento-card-hover p-5 md:p-6">
      <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
        場地對比
      </h4>
      <p className="mt-0.5 text-[11px] text-text-subtle">沙田 vs 跑馬地表現</p>

      {rows.length === 0 ? (
        <EmptyMini hint="暫無場地資料" />
      ) : (
        <ul className="mt-4 space-y-4" aria-label="按場地拆分">
          {rows.map((r) => {
            const pct = (r.races / maxRaces) * 100;
            const isST = r.venue === "ST";
            return (
              <li key={r.venue} className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold">
                    <span className="mr-1.5 inline-flex items-center gap-1">
                      <VenueGlyph venue={r.venue} />
                      {venueLabel(r.venue)}
                    </span>
                    <span className="text-text-subtle number-mono">
                      {r.judged}/{r.races}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "number-mono font-bold",
                      r.pnl > 0 && "text-precision-glow",
                      r.pnl < 0 && "text-danger",
                      r.pnl === 0 && "text-text-muted",
                    )}
                  >
                    {formatHk(r.pnl, true)}
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0",
                      isST && "bg-precision/70",
                    )}
                    style={{
                      width: `${pct}%`,
                      ...(isST
                        ? {}
                        : { background: HV_STRIPE_BG }),
                    }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-center justify-end text-[10px] text-text-subtle">
                  <span className="number-mono">ROI {formatRoi(r.roi)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function VenueGlyph({ venue }: { venue: string }) {
  if (venue === "ST")
    return (
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-sm bg-precision shadow-[0_0_4px_rgba(52,211,153,0.6)]"
      />
    );
  if (venue === "HV")
    return (
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-sm"
        style={{ background: HV_STRIPE_BG }}
      />
    );
  return (
    <span aria-hidden className="inline-block h-2 w-2 rounded-sm bg-text-subtle" />
  );
}

function EmptyMini({ hint }: { hint: string }) {
  return (
    <div className="mt-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-border-subtle text-[11px] text-text-subtle">
      {hint}
    </div>
  );
}
