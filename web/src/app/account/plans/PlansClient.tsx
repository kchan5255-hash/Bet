"use client";

import { useState } from "react";
import { Check, Crown, Shield, Zap, BadgeCheck } from "lucide-react";
import { useSubscription } from "@/lib/subscription";
import { cn } from "@/lib/utils";

type Cycle = "monthly" | "annual";

const PLAN_FEATURES_FREE = [
  "全部場次基本資料",
  "馬匹、騎師、練馬師資訊",
  "檔位、負磅、近六場成績",
];

const PLAN_FEATURES_PRO = [
  "AI 概率評分與 rawScore",
  "四大數據排序",
  "正/負面因素標籤",
  "獸醫警示風險標記",
  "歷史命中率追蹤",
];

const PLAN_FEATURES_ANNUAL_EXTRA = [
  "節省 HK$696／年",
  "優先客服支援",
  "自訂特徵權重（即將推出）",
  "API 訪問（即將推出）",
];

const FAQS = [
  {
    q: "可以隨時取消訂閱嗎？",
    a: "可以。月費方案在下次扣費前取消即不再續費；年費方案於到期前取消，方案使用至期滿。",
  },
  {
    q: "支援哪些付款方式？",
    a: "信用卡（Visa / Mastercard / Amex）、Apple Pay、Google Pay。發票可於付款記錄頁下載。",
  },
  {
    q: "免費方案有時間限制嗎？",
    a: "沒有，永久免費。你可以一直使用免費方案瀏覽基本場次資料，隨時升級 Pro 解鎖完整 AI 預測。",
  },
  {
    q: "Pro 與年費方案差別？",
    a: "功能完全一致。年費等於每月 HK$140，省 30%；月費 HK$198，更靈活。如果預期長期使用，年費更划算。",
  },
];

export function PlansClient({ isAuthed }: { isAuthed: boolean }) {
  const { isPro } = useSubscription();
  const [cycle, setCycle] = useState<Cycle>("annual");

  const proPrice = cycle === "monthly" ? "HK$198" : "HK$140";
  const proPeriod = cycle === "monthly" ? "／月" : "／月（年付）";
  const proBilling =
    cycle === "monthly" ? "每月扣費，可隨時取消" : "一次年付 HK$1,680，省 30%";

  return (
    <>
      <div className="flex justify-center md:justify-start mb-6 md:mb-8">
        <CycleToggle cycle={cycle} setCycle={setCycle} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-12">
        <PlanCard
          name="免費方案"
          tagline="先了解系統，零門檻起步"
          price="HK$0"
          period="永久免費"
          billing="無需信用卡"
          features={PLAN_FEATURES_FREE}
          mutedFeatures={[
            "AI 概率評分",
            "四大數據排序",
            "歷史命中率追蹤",
          ]}
          ctaLabel={isAuthed && !isPro ? "目前方案" : "選擇免費"}
          ctaDisabled={isAuthed && !isPro}
          highlight={false}
        />

        <PlanCard
          name="Pro 方案"
          tagline="解鎖完整 AI 預測引擎"
          price={proPrice}
          period={proPeriod}
          billing={proBilling}
          features={[
            ...PLAN_FEATURES_PRO,
            ...(cycle === "annual" ? PLAN_FEATURES_ANNUAL_EXTRA : []),
          ]}
          ctaLabel={isPro ? "管理 Pro 訂閱" : "升級 Pro"}
          ctaDisabled={false}
          highlight
          badge={cycle === "annual" ? "省 30%" : undefined}
        />
      </div>

      <TrustGrid />

      <FaqSection />
    </>
  );
}

function CycleToggle({
  cycle,
  setCycle,
}: {
  cycle: Cycle;
  setCycle: (c: Cycle) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-border-subtle bg-bg-elevated p-0.5 text-xs md:text-sm">
      <button
        type="button"
        onClick={() => setCycle("monthly")}
        className={cn(
          "px-4 py-1.5 rounded-full font-semibold transition",
          cycle === "monthly"
            ? "bg-bg-subtle text-text shadow-inner"
            : "text-text-muted hover:text-text",
        )}
      >
        月付
      </button>
      <button
        type="button"
        onClick={() => setCycle("annual")}
        className={cn(
          "px-4 py-1.5 rounded-full font-semibold transition inline-flex items-center gap-1.5",
          cycle === "annual"
            ? "ai-gradient text-white"
            : "text-text-muted hover:text-text",
        )}
      >
        年付
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[9px] font-bold",
            cycle === "annual"
              ? "bg-white/25 text-white"
              : "bg-precision/15 text-precision-glow",
          )}
        >
          -30%
        </span>
      </button>
    </div>
  );
}

function PlanCard({
  name,
  tagline,
  price,
  period,
  billing,
  features,
  mutedFeatures,
  ctaLabel,
  ctaDisabled,
  highlight,
  badge,
}: {
  name: string;
  tagline: string;
  price: string;
  period: string;
  billing: string;
  features: string[];
  mutedFeatures?: string[];
  ctaLabel: string;
  ctaDisabled: boolean;
  highlight: boolean;
  badge?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-3xl border p-6 md:p-8 flex flex-col overflow-hidden",
        highlight
          ? "border-ai-start/40 bg-gradient-to-br from-ai-start/10 via-bg-elevated to-upset/10 shadow-xl shadow-indigo-500/10"
          : "border-border-subtle bg-bg-elevated/60",
      )}
    >
      {highlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full ai-gradient opacity-30 blur-3xl"
        />
      )}

      <div className="relative flex items-start justify-between mb-5">
        <div>
          <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
            {name}
            {highlight && <Crown className="h-4 w-4 text-upset-glow" />}
          </h3>
          <p className="text-xs md:text-sm text-text-muted mt-1">{tagline}</p>
        </div>
        {badge && (
          <span className="rounded-full ai-gradient px-2.5 py-0.5 text-[10px] font-bold text-white shrink-0">
            {badge}
          </span>
        )}
      </div>

      <div className="relative mb-5 md:mb-6">
        <div className="flex items-baseline gap-1">
          <span className="number-mono text-4xl md:text-5xl font-black">
            {price}
          </span>
          <span className="text-xs md:text-sm text-text-muted">{period}</span>
        </div>
        <div className="text-[11px] md:text-xs text-text-subtle mt-1.5">
          {billing}
        </div>
      </div>

      <ul className="relative space-y-2.5 mb-6 flex-1">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2.5 text-[13px] md:text-sm leading-relaxed"
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full shrink-0",
                highlight
                  ? "bg-ai-start/20 text-ai-end"
                  : "bg-precision/15 text-precision-glow",
              )}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <span>{f}</span>
          </li>
        ))}
        {mutedFeatures?.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2.5 text-[13px] md:text-sm leading-relaxed opacity-40"
          >
            <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-bg-subtle text-text-subtle shrink-0">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={ctaDisabled}
        className={cn(
          "relative w-full rounded-xl py-3 text-sm md:text-base font-semibold transition",
          ctaDisabled
            ? "bg-bg-subtle text-text-subtle cursor-not-allowed"
            : highlight
              ? "ai-gradient text-white shadow-lg shadow-indigo-500/25 hover:opacity-95"
              : "border border-border bg-bg-subtle hover:border-text-muted",
        )}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

function TrustGrid() {
  const items = [
    {
      icon: Shield,
      title: "可隨時取消",
      desc: "月費或年費皆可在續費前取消，剩餘期間照常使用。",
    },
    {
      icon: BadgeCheck,
      title: "200+ 賽馬日回測",
      desc: "2024-01 至今完整 walk-forward 回測，績效公開可查。",
    },
    {
      icon: Zap,
      title: "每日自動更新",
      desc: "賽果與派彩自動爬取入庫，模型即時重算當日預測。",
    },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-12">
      {items.map((it) => (
        <div
          key={it.title}
          className="rounded-2xl border border-border-subtle bg-bg-elevated/60 backdrop-blur-sm p-5"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-precision/10 border border-precision/20 text-precision-glow mb-3">
            <it.icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm md:text-base font-bold mb-1.5">{it.title}</h3>
          <p className="text-xs md:text-sm text-text-muted leading-relaxed">
            {it.desc}
          </p>
        </div>
      ))}
    </section>
  );
}

function FaqSection() {
  return (
    <section className="mb-8">
      <div className="hidden md:flex items-center gap-2 text-[10px] text-text-subtle uppercase tracking-widest mb-2">
        <span className="h-px w-8 bg-border" />
        FAQ
      </div>
      <h2 className="text-xl md:text-2xl font-black tracking-tight mb-4 md:mb-6">
        常見問題
      </h2>
      <div className="space-y-3">
        {FAQS.map((f) => (
          <details
            key={f.q}
            className="group rounded-2xl border border-border-subtle bg-bg-elevated/60 backdrop-blur-sm overflow-hidden"
          >
            <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none hover:bg-bg-subtle/40 transition">
              <span className="text-sm md:text-base font-semibold">{f.q}</span>
              <span className="text-text-muted text-lg group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <div className="px-5 pb-4 text-xs md:text-sm text-text-muted leading-relaxed">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}


