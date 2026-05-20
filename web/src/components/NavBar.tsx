"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/use-auth";
import { Sparkles, Bell, HelpCircle, Gift, UserCircle2 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/races", label: "本期預測" },
  { href: "/results", label: "賽果派彩" },
  { href: "/history", label: "歷史記錄" },
  { href: "/account", label: "帳戶" },
];

const MOBILE_TITLES: Record<string, string> = {
  "/": "Furlong",
  "/races": "勝率預測",
  "/results": "賽果派彩",
  "/history": "歷史記錄",
  "/account": "我的帳戶",
};

export function NavBar() {
  const pathname = usePathname();
  const { user, ready } = useAuth();

  const mobileTitle =
    MOBILE_TITLES[pathname] ??
    (pathname.startsWith("/races")
      ? "勝率預測"
      : pathname.startsWith("/results")
        ? "賽果派彩"
        : pathname.startsWith("/history")
          ? "歷史記錄"
          : pathname.startsWith("/account")
            ? "我的帳戶"
            : "Furlong");

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 border-b border-border-subtle bg-bg-elevated/95 backdrop-blur-lg">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-1">
            <span className="text-base font-bold">{mobileTitle}</span>
            <HelpCircle className="h-4 w-4 text-text-muted" />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative text-text-muted hover:text-text"
            >
              <Gift className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="relative text-text-muted hover:text-text"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 number-mono flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                4
              </span>
            </button>
          </div>
        </div>
      </header>

      <header className="hidden md:block sticky top-0 z-40 border-b border-border-subtle glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg ai-gradient ring-1 ring-precision/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-[0.15em]">FURLONG</div>
              <div className="text-[10px] text-text-subtle tracking-widest">
                RACE INTELLIGENCE
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-3 py-1.5 text-sm font-medium transition-colors rounded-md",
                    active
                      ? "text-text"
                      : "text-text-muted hover:text-text hover:bg-bg-elevated/60",
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-precision" />
                  )}
                </Link>
              );
            })}
            {ready && !user ? (
              <Link
                href="/login"
                className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:border-precision/50 hover:text-text"
              >
                <UserCircle2 className="h-4 w-4" />
                登入
              </Link>
            ) : null}
          </nav>
        </div>
      </header>
    </>
  );
}
