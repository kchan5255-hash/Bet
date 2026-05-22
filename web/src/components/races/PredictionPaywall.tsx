"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

export function PredictionPaywall() {
  return (
    <div className="bento-card relative overflow-hidden p-5 md:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 0%, rgba(255,176,72,0.18), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-overlay px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-text-subtle">
          <Lock className="h-3 w-3" aria-hidden />
          Members only
        </div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-text">
          <Sparkles className="h-4 w-4 text-precision-glow" aria-hidden />
          登入即可解鎖 V19 預測
        </h3>
        <p className="text-sm leading-relaxed text-text-muted">
          量化模型評分、Tier 等級、連贏組合與膽拖建議僅向已登入會員開放。
          馬匹基本資料、賠率與賽果保持公開。
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-precision-glow px-4 py-2 text-sm font-semibold text-bg-base hover:opacity-90"
          >
            登入
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface-overlay px-4 py-2 text-sm font-semibold text-text hover:bg-surface-elevated"
          >
            註冊
          </Link>
        </div>
      </div>
    </div>
  );
}
