"use client";

import { AlertTriangle } from "lucide-react";
import type { V19BannerView } from "@/lib/race-view-types";
import { translateGateReason } from "./utils";

interface RaceSkipCardProps {
  banner: V19BannerView;
}

export function RaceSkipCard({ banner }: RaceSkipCardProps) {
  return (
    <section
      aria-label="V19 不推介本場"
      className="rounded-xl border-l-[3px] border-l-warning border border-warning/30 bg-warning/[0.06] p-3"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <div className="flex-1">
          <div className="text-xs font-bold text-text">V19 唔推介本場</div>
          <div className="mt-0.5 text-[11px] text-text-muted">
            原因：{translateGateReason(banner.gate.reason)}
          </div>
        </div>
      </div>
    </section>
  );
}
