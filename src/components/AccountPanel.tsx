"use client";

import Link from "next/link";
import {
  AlertCircle,
  Bell,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Flame,
  HelpCircle,
  History,
  LogIn,
  LogOut,
  MessageSquare,
  Receipt,
  Settings,
  Sparkles,
  Star,
  Trophy,
  UserCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useSubscription } from "@/lib/subscription";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

type AccountUser = {
  email: string | null;
  emailConfirmed: boolean;
  displayName: string | null;
  avatarUrl: string | null;
};

function toAccountUser(user: User | null): AccountUser | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : null;
  const avatarUrl =
    typeof meta.avatar_url === "string" ? meta.avatar_url : null;
  return {
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at || user.confirmed_at),
    displayName: fullName,
    avatarUrl,
  };
}

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

type MenuItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
  trailing?: string;
  badge?: number;
  disabled?: boolean;
};

export function AccountPanel({ user }: { user: User | null }) {
  const account = toAccountUser(user);
  const { isPro, ready, toggle } = useSubscription();
  const isAuthed = Boolean(account);

  return (
    <div className="space-y-6 md:space-y-10">
      <section className="rounded-2xl border border-border-subtle bg-bg-elevated p-4 md:p-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full bg-bg-subtle shrink-0 overflow-hidden">
            {account?.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle2 className="h-6 w-6 md:h-7 md:w-7 text-text-muted" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs md:text-sm text-text-muted">
              {isAuthed
                ? account?.displayName ?? "已登入"
                : "尚未登入"}
            </div>
            <div className="text-base md:text-xl font-bold truncate">
              {account?.email ?? "guest@furlong.app"}
            </div>
          </div>
          <StatusBadge isPro={isPro} ready={ready} authed={isAuthed} />
        </div>

        {isAuthed && account && !account.emailConfirmed ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-upset/30 bg-upset/10 px-3 py-2.5 text-xs text-upset-glow">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              你的 email 尚未驗證。請查收 {account.email} 的驗證信，點擊連結完成驗證。
            </span>
          </div>
        ) : null}

        {isAuthed ? (
          <form action={signOut} className="mt-4 md:mt-5">
            <button
              type="submit"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-md border border-border bg-bg-subtle px-3 py-2 text-xs font-semibold text-text-muted hover:border-text-muted hover:text-text transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              登出
            </button>
          </form>
        ) : (
          <div className="mt-4 md:mt-5 grid grid-cols-2 gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-md ai-gradient px-3 py-2 text-xs font-semibold text-white"
            >
              <LogIn className="h-3.5 w-3.5" />
              登入
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-bg-subtle px-3 py-2 text-xs font-semibold text-text-muted hover:border-text-muted hover:text-text transition"
            >
              建立帳號
            </Link>
          </div>
        )}

        <div className="mt-4 md:mt-5 rounded-xl border border-dashed border-border bg-bg-subtle px-3 py-3 md:px-4 md:flex md:flex-wrap md:items-center md:gap-3">
          <div className="flex items-start gap-2 md:items-center">
            <Sparkles className="h-4 w-4 text-upset-glow shrink-0 mt-0.5 md:mt-0" />
            <span className="text-xs text-text-muted leading-relaxed">
              Demo 模式：所有功能對所有人開放，可切換 Pro 預覽差異
            </span>
          </div>
          <button
            onClick={() => toggle(!isPro)}
            disabled={!ready}
            className={cn(
              "mt-3 w-full md:mt-0 md:ml-auto md:w-auto rounded-md px-3 py-2 md:py-1 text-xs font-semibold transition",
              isPro
                ? "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20"
                : "ai-gradient text-white",
            )}
          >
            {isPro ? "切換回免費" : "切換為 Pro"}
          </button>
        </div>
      </section>

      <MenuGroup icon={Crown} title="訂閱 Pro">
        <ProUpsellRow isPro={isPro} />
        <MenuRow
          item={{ icon: Receipt, label: "付費記錄", trailing: "暫無記錄", disabled: true }}
        />
      </MenuGroup>

      <MenuGroup icon={Flame} title="更多功能">
        <MenuRow item={{ icon: Trophy, label: "賽果派彩", href: "/results" }} />
        <MenuRow item={{ icon: Sparkles, label: "勝率預測", href: "/races" }} />
        <MenuRow item={{ icon: History, label: "歷史記錄", href: "/history" }} />
        <MenuRow item={{ icon: Star, label: "自選分析", trailing: "即將推出", disabled: true }} />
      </MenuGroup>

      <MenuGroup icon={Settings} title="設定與服務">
        <MenuRow
          item={{
            icon: Coins,
            label: "我的積分",
            trailing: isAuthed ? "0 積分" : "請先登入賬號",
            disabled: true,
          }}
        />
        <MenuRow item={{ icon: Bell, label: "訊息", badge: 8, disabled: true }} />
        <MenuRow item={{ icon: Settings, label: "設定", disabled: true }} />
        <MenuRow item={{ icon: MessageSquare, label: "聯絡我們", disabled: true }} />
        <MenuRow item={{ icon: HelpCircle, label: "幫助中心", disabled: true }} />
      </MenuGroup>

      <section id="plans">
        <div className="hidden md:flex items-center gap-2 text-xs text-text-subtle uppercase tracking-widest mb-2">
          <span className="h-px w-8 bg-border" />
          Plans & Pricing
        </div>
        <h2 className="text-lg md:text-2xl font-black tracking-tight mb-4 md:mb-6">訂閱方案</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} isCurrent={plan.id === "free" ? !isPro : false} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MenuGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 px-1 mb-2 text-sm font-semibold text-text-muted">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </div>
      <div className="rounded-2xl border border-border-subtle bg-bg-elevated overflow-hidden divide-y divide-border-subtle">
        {children}
      </div>
    </section>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  const Icon = item.icon;
  const content = (
    <>
      <div className="relative shrink-0">
        <Icon
          className={cn(
            "h-5 w-5",
            item.disabled ? "text-text-subtle" : "text-text-muted",
          )}
        />
        {item.badge !== undefined && item.badge > 0 && (
          <span className="number-mono absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {item.badge}
          </span>
        )}
      </div>
      <span
        className={cn(
          "flex-1 text-[15px] font-medium",
          item.disabled ? "text-text-muted" : "text-text",
        )}
      >
        {item.label}
      </span>
      {item.trailing && (
        <span className="text-xs text-text-subtle">{item.trailing}</span>
      )}
      {!item.disabled && <ChevronRight className="h-4 w-4 text-text-subtle shrink-0" />}
    </>
  );

  const baseClass =
    "flex items-center gap-3 px-4 py-3.5 transition-colors min-h-[52px]";

  if (item.href && !item.disabled) {
    return (
      <Link href={item.href} className={cn(baseClass, "hover:bg-bg-subtle/60 active:bg-bg-subtle")}>
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        baseClass,
        item.disabled ? "opacity-60" : "hover:bg-bg-subtle/60 active:bg-bg-subtle cursor-pointer",
      )}
    >
      {content}
    </div>
  );
}

function ProUpsellRow({ isPro }: { isPro: boolean }) {
  return (
    <Link
      href="#plans"
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 min-h-[52px] transition-opacity",
        "ai-gradient text-white hover:opacity-95 active:opacity-90",
      )}
    >
      <Crown className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-[15px] font-bold">
        {isPro ? "管理 Pro 訂閱" : "訂閱 Pro"}
      </span>
      <span className="text-xs font-semibold text-white/90">
        {isPro ? "Pro 會員" : "解鎖 AI"}
      </span>
      <ChevronRight className="h-4 w-4 text-white/80 shrink-0" />
    </Link>
  );
}

function StatusBadge({
  isPro,
  ready,
  authed,
}: {
  isPro: boolean;
  ready: boolean;
  authed: boolean;
}) {
  if (!ready) {
    return (
      <span className="rounded-full border border-border-subtle px-2 py-1 text-[10px] md:text-xs text-text-subtle shrink-0">
        載入中…
      </span>
    );
  }
  if (!authed) {
    return (
      <span className="rounded-full border border-border bg-bg-subtle px-2 md:px-3 py-1 text-[10px] md:text-xs font-medium text-text-muted shrink-0">
        訪客
      </span>
    );
  }
  if (isPro) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full ai-gradient px-2 md:px-3 py-1 text-[10px] md:text-xs font-semibold text-white shrink-0">
        <Crown className="h-3 w-3" />
        Pro 會員
      </span>
    );
  }
  return (
    <span className="rounded-full border border-border bg-bg-subtle px-2 md:px-3 py-1 text-[10px] md:text-xs font-medium text-text-muted shrink-0">
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
        "relative rounded-2xl border p-4 md:p-6 flex flex-col transition",
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

      <div className="mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-bold mb-1">{plan.name}</h3>
        <p className="text-xs text-text-muted">{plan.desc}</p>
      </div>

      <div className="mb-4 md:mb-6">
        <div className="flex items-baseline gap-2">
          <span className="number-mono text-3xl md:text-4xl font-black">{plan.price}</span>
        </div>
        <div className="text-[11px] text-text-subtle mt-1">{plan.period}</div>
      </div>

      <ul className="space-y-2 md:space-y-2.5 mb-4 md:mb-6 flex-1">
        {plan.features.map((f) => (
          <li
            key={f.text}
            className={cn(
              "flex items-start gap-2 text-[13px] md:text-sm leading-relaxed",
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
