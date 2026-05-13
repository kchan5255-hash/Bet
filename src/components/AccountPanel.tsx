"use client";

import { Check, Crown, Sparkles, UserCircle2 } from "lucide-react";
import { useSubscription } from "@/lib/subscription";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "free",
    name: "免費方案",
    price: "HK$0",
    period: "永久免費",
    desc: "適合想了解系統的新手",
    features: [
      { text: "全部場次基本資料", enabled: true },
      { text: "馬匹、騎師、練馬師資訊", enabled: true },
      { text: "檔位、負磅、近六場成績", enabled: true },
      { text: "AI 概率評分", enabled: false },
      { text: "四大數據推介 + 冷門黑馬", enabled: false },
      { text: "歷史命中率追蹤", enabled: false },
    ],
    highlight: false,
  },
  {
    id: "monthly",
    name: "Pro 月費",
    price: "HK$198",
    period: "每月",
    desc: "完整解鎖，靈活訂閱",
    features: [
      { text: "全部場次基本資料", enabled: true },
      { text: "AI 概率評分與 rawScore", enabled: true },
      { text: "四大數據推介 + 冷門黑馬", enabled: true },
      { text: "正/負面因素標籤", enabled: true },
      { text: "獸醫警示風險標記", enabled: true },
      { text: "歷史命中率追蹤", enabled: true },
    ],
    highlight: false,
  },
  {
    id: "annual",
    name: "Pro 年費",
    price: "HK$1,680",
    period: "每年（約 HK$140/月）",
    desc: "一次訂閱，省 30%",
    features: [
      { text: "Pro 月費全部功能", enabled: true },
      { text: "節省 HK$696／年", enabled: true },
      { text: "優先客服支援", enabled: true },
      { text: "新功能搶先體驗", enabled: true },
      { text: "自訂特徵權重（即將推出）", enabled: true },
      { text: "API 訪問（即將推出）", enabled: true },
      { text: "自動注碼建議", enabled: true },
    ],
    highlight: true,
  },
];

export function AccountPanel() {
  const { isPro, ready, toggle } = useSubscription();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-border-subtle bg-bg-elevated p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-subtle">
            <UserCircle2 className="h-7 w-7 text-text-muted" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-text-muted">Demo 訪客</div>
            <div className="text-xl font-bold">guest@furlong.app</div>
          </div>
          <StatusBadge isPro={isPro} ready={ready} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border bg-bg-subtle px-4 py-3">
          <Sparkles className="h-4 w-4 text-upset-glow" />
          <span className="text-xs text-text-muted">
            Demo 模式：可切換 Pro 狀態預覽付費內容（階段二將改為 Stripe 訂閱）
          </span>
          <button
            onClick={() => toggle(!isPro)}
            disabled={!ready}
            className={cn(
              "ml-auto rounded-md px-3 py-1 text-xs font-semibold transition",
              isPro
                ? "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20"
                : "ai-gradient text-white",
            )}
          >
            {isPro ? "切換回免費" : "切換為 Pro"}
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 text-xs text-text-subtle uppercase tracking-widest mb-2">
          <span className="h-px w-8 bg-border" />
          Plans & Pricing
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-6">訂閱方案</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} isCurrent={plan.id === "free" ? !isPro : false} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ isPro, ready }: { isPro: boolean; ready: boolean }) {
  if (!ready) {
    return (
      <span className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-subtle">
        載入中…
      </span>
    );
  }
  if (isPro) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full ai-gradient px-3 py-1 text-xs font-semibold text-white">
        <Crown className="h-3 w-3" />
        Pro 會員
      </span>
    );
  }
  return (
    <span className="rounded-full border border-border bg-bg-subtle px-3 py-1 text-xs font-medium text-text-muted">
      免費方案
    </span>
  );
}

function PlanCard({
  plan,
  isCurrent,
}: {
  plan: (typeof PLANS)[number];
  isCurrent: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-6 flex flex-col transition",
        plan.highlight
          ? "border-upset/50 bg-gradient-to-b from-upset/10 to-bg-elevated shadow-lg shadow-upset/10"
          : "border-border-subtle bg-bg-elevated",
      )}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full ai-gradient px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            <Crown className="h-3 w-3" />
            最多人選
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
        <p className="text-xs text-text-muted">{plan.desc}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="number-mono text-4xl font-black">{plan.price}</span>
        </div>
        <div className="text-[11px] text-text-subtle mt-1">{plan.period}</div>
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((f) => (
          <li
            key={f.text}
            className={cn(
              "flex items-start gap-2 text-sm leading-relaxed",
              !f.enabled && "opacity-40",
            )}
          >
            <Check
              className={cn(
                "h-4 w-4 flex-shrink-0 mt-0.5",
                f.enabled ? "text-precision" : "text-text-subtle",
              )}
            />
            <span>{f.text}</span>
          </li>
        ))}
      </ul>

      <button
        disabled={isCurrent}
        className={cn(
          "w-full rounded-xl py-2.5 text-sm font-semibold transition",
          isCurrent
            ? "bg-bg-subtle text-text-subtle cursor-not-allowed"
            : plan.highlight
              ? "ai-gradient text-white hover:opacity-90"
              : "border border-border bg-bg-subtle hover:border-text-muted",
        )}
      >
        {isCurrent ? "目前方案" : plan.id === "free" ? "選擇免費" : "訂閱"}
      </button>
    </div>
  );
}
