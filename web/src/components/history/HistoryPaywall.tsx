import Link from "next/link";
import { Lock, BarChart3 } from "lucide-react";

export function HistoryPaywall() {
  return (
    <div className="bento-card relative overflow-hidden p-6 md:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 0%, rgba(255,176,72,0.18), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative space-y-4">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-overlay px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-text-subtle">
          <Lock className="h-3 w-3" aria-hidden />
          Members only
        </div>
        <h1 className="flex items-center gap-2 text-xl font-black tracking-tight md:text-2xl">
          <BarChart3 className="h-5 w-5 text-precision-glow" aria-hidden />
          歷史回測僅限會員
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-text-muted md:text-[15px]">
          V19 模型自 2024 年至今的逐場回測、ROI 曲線、Tier
          分層、場地與距離 breakdown 屬會員專享資料。註冊免費，登入即可解鎖完整資料庫。
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
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
