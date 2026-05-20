import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  LineChart,
  ArrowRight,
} from "lucide-react";
import { getRaces, getMeetingDate, formatMeetingDate } from "@/lib/data";

export default function LandingPage() {
  const races = getRaces();
  const meetingDate = getMeetingDate();
  const totalRunners = races.reduce((sum, r) => sum + r.runners.length, 0);

  return (
    <div className="mx-auto max-w-7xl px-6">
      {/* Hero */}
      <section className="pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-precision opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-precision" />
          </span>
          <span className="text-xs text-text-muted">
            本期：{formatMeetingDate(meetingDate)} · {races.length} 場 ·{" "}
            {totalRunners} 匹馬
          </span>
        </div>

        <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight">
          以<span className="ai-text-gradient"> 量化數據 </span>
          <br className="md:hidden" />
          解構每一場賽事
        </h1>
        <p className="mt-6 text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
          14 項特徵因子加權、獸醫警示、歷史命中追蹤——從 Bloomberg 級介面出發，
          讓你看見數據背後的信號，而非噪音。
        </p>

        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/races"
            className="inline-flex items-center gap-2 rounded-xl ai-gradient px-6 py-3 font-semibold shadow-lg shadow-indigo-500/30 hover:opacity-90 transition"
          >
            查看本期預測
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/results"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-6 py-3 font-semibold text-text-muted hover:text-text hover:border-text-muted transition"
          >
            賽果派彩
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-6 py-3 font-semibold text-text-muted hover:text-text hover:border-text-muted transition"
          >
            定價方案
          </Link>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-16">
        {/* 大卡片：四大數據推介 */}
        <div className="md:col-span-2 bento-card bento-card-precision p-6 flex flex-col gap-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-precision/30 bg-precision/10 text-precision">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-2">四大數據推介</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              每場 Top 4 精準選馬，基於 14 項特徵加權評分，給你最清晰的主線。
            </p>
          </div>
          <div className="mt-auto flex items-center gap-6 pt-4 border-t border-border-subtle">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">本期場次</div>
              <div className="flex items-baseline gap-1">
                <span className="number-mono text-2xl font-black text-precision-glow">{races.length}</span>
                <span className="text-xs text-text-muted">場</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">分析馬匹</div>
              <div className="flex items-baseline gap-1">
                <span className="number-mono text-2xl font-black text-precision-glow">{totalRunners}</span>
                <span className="text-xs text-text-muted">匹</span>
              </div>
            </div>
          </div>
        </div>

        {/* 小卡片：冷門黑馬 */}
        <div className="bento-card bento-card-hover p-6 flex flex-col gap-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-upset/30 bg-upset/10 text-upset-glow">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold mb-2">冷門黑馬挖掘</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              篩選被市場低估、正面因子足夠的爆冷標的，尋找價值缺口。
            </p>
          </div>
        </div>

        {/* 小卡片：統計 */}
        <div className="bento-card bento-card-hover p-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-bg-subtle shrink-0">
            <TrendingUp className="h-5 w-5 text-precision" />
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">本期場次</div>
            <div className="flex items-baseline gap-1">
              <span className="number-mono text-3xl font-black">{races.length}</span>
              <span className="text-sm text-text-muted">場</span>
            </div>
          </div>
        </div>

        <div className="bento-card bento-card-hover p-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-bg-subtle shrink-0">
            <LineChart className="h-5 w-5 text-upset" />
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">分析馬匹</div>
            <div className="flex items-baseline gap-1">
              <span className="number-mono text-3xl font-black">{totalRunners}</span>
              <span className="text-sm text-text-muted">匹</span>
            </div>
          </div>
        </div>

        {/* Pro 卡片 */}
        <div className="relative overflow-hidden bento-card p-6 border-ai-start/30 flex flex-col gap-3">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full ai-gradient opacity-20 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-bg-elevated px-3 py-1 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-upset-glow" />
              <span className="text-xs">Pro 訂閱</span>
            </div>
            <h2 className="text-xl font-bold mb-2">解鎖完整預測引擎</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              AI 概率評分、四大推介、冷門黑馬、正負因素標籤、歷史命中率。
            </p>
            <Link
              href="/account"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-text text-bg px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
            >
              查看方案
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
