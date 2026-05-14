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

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 py-12">
        <FeatureCard
          icon={<Target className="h-5 w-5" />}
          tint="precision"
          title="四大數據推介"
          desc="每場 Top 4 精準選馬，基於 14 項特徵加權評分，給你最清晰的主線。"
        />
        <FeatureCard
          icon={<Zap className="h-5 w-5" />}
          tint="upset"
          title="冷門黑馬挖掘"
          desc="篩選被市場低估、正面因子足夠的爆冷標的，尋找價值缺口。"
        />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-16">
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-precision" />}
          label="本期場次"
          value={String(races.length)}
          suffix="場"
        />
        <StatCard
          icon={<LineChart className="h-5 w-5 text-upset" />}
          label="分析馬匹"
          value={String(totalRunners)}
          suffix="匹"
        />
      </section>

      <section className="relative overflow-hidden rounded-2xl glass p-10 mb-16">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full ai-gradient opacity-20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-bg-elevated px-3 py-1 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-upset-glow" />
            <span className="text-xs">Pro 訂閱</span>
          </div>
          <h2 className="text-3xl font-bold mb-3">解鎖完整預測引擎</h2>
          <p className="text-text-muted max-w-xl leading-relaxed">
            免費用戶可查看所有馬匹基本資料。訂閱 Pro 解鎖：AI 概率評分、四大推介、
            冷門黑馬、正負因素標籤、歷史命中率。
          </p>
          <Link
            href="/account"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-text text-bg px-5 py-2.5 font-semibold hover:opacity-90 transition"
          >
            查看方案
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  tint,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tint: "precision" | "upset";
}) {
  const tintMap = {
    precision: "text-precision border-precision/30 bg-precision/10",
    upset: "text-upset-glow border-upset/30 bg-upset/10",
  };
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6 hover:border-border transition">
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${tintMap[tint]} mb-4`}
      >
        {icon}
      </div>
      <h3 className="text-base font-bold mb-2">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6 flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-bg-subtle">
        {icon}
      </div>
      <div>
        <div className="text-xs text-text-muted mb-1">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="number-mono text-3xl font-bold">{value}</span>
          <span className="text-sm text-text-muted">{suffix}</span>
        </div>
      </div>
    </div>
  );
}
