"use client";

import Link from "next/link";
import {
  Bell,
  Check,
  ChevronRight,
  Crown,
  Edit3,
  HelpCircle,
  History,
  LogIn,
  LogOut,
  Mail,
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
import { EmailVerifyAlert } from "@/components/auth/EmailVerifyAlert";

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
  const { isPro, ready } = useSubscription();
  const isAuthed = Boolean(account);

  const displayName =
    account?.displayName ??
    account?.email?.split("@")[0] ??
    (isAuthed ? "已登入" : "訪客");
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6 md:space-y-8">
      <HeroCard
        account={account}
        isAuthed={isAuthed}
        isPro={isPro}
        ready={ready}
        displayName={displayName}
        initial={initial}
      />

      {isAuthed && account && !account.emailConfirmed ? (
        <EmailVerifyAlert email={account.email} />
      ) : null}

      <QuickActionGrid />

      <PlansEntry isPro={isPro} />

      <SettingsList isAuthed={isAuthed} />
    </div>
  );
}

function HeroCard({
  account,
  isAuthed,
  isPro,
  ready,
  displayName,
  initial,
}: {
  account: AccountUser | null;
  isAuthed: boolean;
  isPro: boolean;
  ready: boolean;
  displayName: string;
  initial: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border-subtle bg-bg-elevated/80 backdrop-blur-xl p-5 md:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full ai-gradient opacity-25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-precision/20 blur-3xl"
      />

      <div className="relative flex items-start gap-4 md:gap-5">
        <div className="relative shrink-0">
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden ring-1 ring-border bg-gradient-to-br from-ai-start/30 to-ai-end/20 flex items-center justify-center">
            {account?.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : isAuthed ? (
              <span className="text-2xl md:text-3xl font-black text-white">
                {initial}
              </span>
            ) : (
              <UserCircle2 className="h-8 w-8 md:h-10 md:w-10 text-text-muted" />
            )}
          </div>
          {isAuthed && (
            <span
              className={cn(
                "absolute -bottom-1 -right-1 h-4 w-4 md:h-5 md:w-5 rounded-full border-2 border-bg-elevated",
                isPro ? "bg-upset-glow" : "bg-precision",
              )}
              title={isPro ? "Pro" : "Free"}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base md:text-lg font-bold truncate">
              {displayName}
            </span>
            <StatusPill isPro={isPro} ready={ready} authed={isAuthed} />
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs md:text-sm text-text-muted truncate">
            {isAuthed ? (
              <>
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{account?.email}</span>
              </>
            ) : (
              <span>登入後解鎖完整 AI 預測引擎</span>
            )}
          </div>

          {isAuthed && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-subtle/60 px-3 py-1.5 text-[11px] md:text-xs font-medium text-text-muted hover:border-border transition disabled:opacity-60"
              >
                <Edit3 className="h-3 w-3" />
                編輯資料
              </button>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-subtle/60 px-3 py-1.5 text-[11px] md:text-xs font-medium text-text-muted hover:text-text hover:border-border transition"
                >
                  <LogOut className="h-3 w-3" />
                  登出
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {!isAuthed && (
        <div className="relative mt-5 grid grid-cols-2 gap-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl ai-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
          >
            <LogIn className="h-4 w-4" />
            登入
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-subtle px-4 py-2.5 text-sm font-semibold text-text-muted hover:text-text hover:border-text-muted transition"
          >
            建立帳號
          </Link>
        </div>
      )}

      {isAuthed && (
        <div className="relative mt-5 grid grid-cols-3 gap-2 md:gap-3 pt-5 border-t border-border-subtle">
          <Stat label="本月跟單" value="0" suffix="場" />
          <Stat label="累計命中" value="—" />
          <Stat label="積分" value="0" />
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="text-[10px] md:text-xs uppercase tracking-wider text-text-subtle mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="number-mono text-lg md:text-2xl font-black">
          {value}
        </span>
        {suffix && (
          <span className="text-[10px] md:text-xs text-text-muted">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusPill({
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
      <span className="rounded-full border border-border-subtle px-2 py-0.5 text-[10px] text-text-subtle">
        載入中
      </span>
    );
  }
  if (!authed) {
    return (
      <span className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[10px] font-medium text-text-muted">
        訪客
      </span>
    );
  }
  if (isPro) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full ai-gradient px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        <Crown className="h-2.5 w-2.5" />
        Pro
      </span>
    );
  }
  return (
    <span className="rounded-full border border-precision/40 bg-precision/10 px-2 py-0.5 text-[10px] font-semibold text-precision-glow">
      Free
    </span>
  );
}

function QuickActionGrid() {
  const actions: {
    icon: LucideIcon;
    label: string;
    href: string;
    accent: "precision" | "upset" | "ai" | "neutral";
  }[] = [
    { icon: Trophy, label: "賽果派彩", href: "/results", accent: "precision" },
    { icon: Sparkles, label: "勝率預測", href: "/races", accent: "ai" },
    { icon: History, label: "歷史記錄", href: "/history", accent: "upset" },
    { icon: Star, label: "自選分析", href: "#", accent: "neutral" },
  ];

  return (
    <section>
      <SectionHeader eyebrow="Quick Access" title="快速入口" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="group relative rounded-2xl border border-border-subtle bg-bg-elevated/60 backdrop-blur-sm p-4 hover:border-border transition overflow-hidden"
          >
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition",
                a.accent === "precision" &&
                  "bg-gradient-to-br from-precision/10 to-transparent",
                a.accent === "ai" &&
                  "bg-gradient-to-br from-ai-start/10 to-transparent",
                a.accent === "upset" &&
                  "bg-gradient-to-br from-upset/10 to-transparent",
                a.accent === "neutral" &&
                  "bg-gradient-to-br from-bg-subtle/40 to-transparent",
              )}
            />
            <div
              className={cn(
                "relative inline-flex h-9 w-9 items-center justify-center rounded-lg mb-3",
                a.accent === "precision" &&
                  "bg-precision/10 text-precision-glow border border-precision/20",
                a.accent === "ai" &&
                  "bg-ai-start/10 text-ai-end border border-ai-start/20",
                a.accent === "upset" &&
                  "bg-upset/10 text-upset-glow border border-upset/20",
                a.accent === "neutral" &&
                  "bg-bg-subtle text-text-muted border border-border-subtle",
              )}
            >
              <a.icon className="h-4 w-4" />
            </div>
            <div className="relative text-sm font-semibold">{a.label}</div>
            <ChevronRight className="relative mt-1 h-3.5 w-3.5 text-text-subtle group-hover:translate-x-0.5 transition" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow: string;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-3 md:mb-4">
      <div>
        <div className="hidden md:flex items-center gap-2 text-[10px] text-text-subtle uppercase tracking-widest mb-1">
          <span className="h-px w-6 bg-border" />
          {eyebrow}
        </div>
        <h2 className="text-base md:text-xl font-black tracking-tight">
          {title}
        </h2>
      </div>
      {trailing}
    </div>
  );
}

function PlansEntry({ isPro }: { isPro: boolean }) {
  return (
    <section>
      <SectionHeader eyebrow="Plans & Pricing" title="訂閱方案" />
      <Link
        href="/account/plans"
        className="group relative block overflow-hidden rounded-3xl border border-ai-start/40 bg-gradient-to-br from-ai-start/15 via-bg-elevated to-upset/15 p-5 md:p-6 transition hover:border-ai-start/70 hover:shadow-xl hover:shadow-indigo-500/15"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full ai-gradient opacity-30 blur-3xl group-hover:opacity-40 transition"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-precision/20 blur-3xl"
        />

        <div className="relative flex items-start gap-4">
          <div className="inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl ai-gradient shadow-lg shadow-indigo-500/30 shrink-0">
            <Crown className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base md:text-lg font-bold tracking-tight">
                {isPro ? "管理 Pro 訂閱" : "升級 Pro"}
              </h3>
              {!isPro && (
                <span className="inline-flex items-center gap-1 rounded-full bg-precision/15 px-2 py-0.5 text-[10px] font-bold text-precision-glow">
                  <Sparkles className="h-2.5 w-2.5" />
                  年付省 30%
                </span>
              )}
            </div>
            <p className="mt-1 text-xs md:text-sm text-text-muted leading-relaxed">
              {isPro
                ? "查看訂閱狀態、付款記錄與方案切換"
                : "解鎖 AI 概率評分、四大推介、冷門黑馬與歷史命中率"}
            </p>

            <div className="mt-3 flex items-center gap-3 text-[11px] md:text-xs text-text-muted">
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-precision" />
                AI 概率評分
              </span>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-precision" />
                冷門黑馬
              </span>
              <span className="hidden md:inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-precision" />
                歷史命中率
              </span>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-text-muted shrink-0 group-hover:translate-x-1 group-hover:text-text transition" />
        </div>
      </Link>
    </section>
  );
}

function SettingsList({ isAuthed }: { isAuthed: boolean }) {
  const items: MenuItem[] = [
    {
      icon: Receipt,
      label: "付款記錄",
      trailing: "暫無記錄",
      disabled: true,
    },
    {
      icon: Bell,
      label: "訊息與通知",
      badge: 8,
      disabled: true,
    },
    {
      icon: Settings,
      label: "偏好設定",
      disabled: true,
    },
    {
      icon: MessageSquare,
      label: "聯絡我們",
      disabled: true,
    },
    {
      icon: HelpCircle,
      label: "幫助中心",
      disabled: true,
    },
  ];

  return (
    <section>
      <SectionHeader eyebrow="Settings" title="設定與服務" />
      <div className="rounded-2xl border border-border-subtle bg-bg-elevated/60 backdrop-blur-sm overflow-hidden divide-y divide-border-subtle">
        {items.map((item) => (
          <MenuRow key={item.label} item={item} />
        ))}
      </div>

      {!isAuthed && (
        <p className="mt-3 text-[11px] text-text-subtle text-center">
          登入後可查看完整服務記錄
        </p>
      )}
    </section>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  const Icon = item.icon;
  const content = (
    <>
      <div
        className={cn(
          "relative shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg",
          item.disabled
            ? "bg-bg-subtle text-text-subtle"
            : "bg-bg-subtle text-text-muted",
        )}
      >
        <Icon className="h-4 w-4" />
        {item.badge !== undefined && item.badge > 0 && (
          <span className="number-mono absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {item.badge}
          </span>
        )}
      </div>
      <span
        className={cn(
          "flex-1 text-[14px] md:text-[15px] font-medium",
          item.disabled ? "text-text-muted" : "text-text",
        )}
      >
        {item.label}
      </span>
      {item.trailing && (
        <span className="text-xs text-text-subtle">{item.trailing}</span>
      )}
      {!item.disabled && (
        <ChevronRight className="h-4 w-4 text-text-subtle shrink-0" />
      )}
    </>
  );

  const baseClass =
    "flex items-center gap-3 px-4 py-3 transition-colors min-h-[56px]";

  if (item.href && !item.disabled) {
    return (
      <Link
        href={item.href}
        className={cn(baseClass, "hover:bg-bg-subtle/60")}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        baseClass,
        item.disabled
          ? "opacity-60"
          : "hover:bg-bg-subtle/60 cursor-pointer",
      )}
    >
      {content}
    </div>
  );
}






