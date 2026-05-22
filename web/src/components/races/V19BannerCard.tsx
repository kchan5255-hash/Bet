"use client";

import { useState, useEffect } from "react";
import { Target } from "lucide-react";
import type {
  RaceRunnerView,
  V19BannerView,
} from "@/lib/race-view-types";
import { cn } from "@/lib/utils";
import { BetSuggestionCard } from "./BetSuggestionCard";
import { TierBadge } from "./TierBadge";
import {
  buildBankerPlay,
  buildBoxPlay,
  buildNameByNo,
  tierLabel,
} from "./utils";

interface V19BannerCardProps {
  banner: V19BannerView;
  runners: RaceRunnerView[];
}

type TabKey = "banker" | "box";

export function V19BannerCard({ banner, runners }: V19BannerCardProps) {
  const tier = banner.recommend?.tier ?? banner.gate.tier ?? "A";
  const stakeMul = banner.recommend?.stakeMul ?? 1;
  const nameByNo = buildNameByNo(runners);
  const banker = buildBankerPlay(banner.recommend?.qinBanker ?? [], nameByNo);
  const box = buildBoxPlay(
    banner.recommend?.qinT12 ?? null,
    banner.recommend?.qinBanker ?? [],
    nameByNo,
  );

  const tabs: { key: TabKey; label: string }[] = [];
  if (banker) tabs.push({ key: "banker", label: "連贏膽拖" });
  if (box) tabs.push({ key: "box", label: "連贏全串" });

  const [tab, setTab] = useState<TabKey>(tabs[0]?.key ?? "banker");

  useEffect(() => {
    setTab(tabs[0]?.key ?? "banker");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner]);

  return (
    <section
      aria-label={`V19 推介 ${tierLabel(tier)}`}
      className="rounded-xl border-l-[3px] border border-l-precision/60 border-precision/20 bg-precision/4 overflow-hidden"
    >
      <div className="flex w-full items-center gap-2 px-3 py-2.5">
        <Target className="h-4 w-4 shrink-0 text-precision-glow" aria-hidden />
        <span className="text-xs font-bold text-text">V19 推介</span>
        <TierBadge tier={tier} size="sm" showLabel />
        <span className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-precision/20 text-precision-glow px-2 py-0.5 text-[10px] font-bold">
            注碼 ×{stakeMul}
          </span>
        </span>
      </div>

      <div className="space-y-3 px-3 pb-3">
        {tabs.length > 1 && (
          <div
            role="tablist"
            aria-label="推介內容"
            className="flex gap-1 rounded-lg border border-border-subtle bg-bg-subtle p-0.5"
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-pressed={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "h-7 flex-1 rounded-md px-2 text-[11px] font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-ai-start",
                  tab === t.key
                    ? "bg-bg-card text-text shadow-sm"
                    : "text-text-muted hover:text-text",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border-subtle bg-bg-card/60 px-3 py-2.5">
          {tab === "banker" && banker && (
            <BetSuggestionCard variant="banker" banker={banker} />
          )}
          {tab === "box" && box && (
            <BetSuggestionCard
              variant="box"
              box={{ ...box, nameByNo }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
