"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sparkles, Bell, HelpCircle, Gift } from "lucide-react";

const NAV_ITEMS = [
  { href: "/races", label: "本期預測" },
  { href: "/history", label: "歷史記錄" },
  { href: "/account", label: "帳戶" },
];

const MOBILE_TITLES: Record<string, string> = {
  "/": "Furlong",
  "/races": "勝率預測",
  "/history": "歷史記錄",
  "/account": "我的帳戶",
};

export function NavBar() {
  const pathname = usePathname();

  const mobileTitle =
    MOBILE_TITLES[pathname] ??
    (pathname.startsWith("/races")
      ? "勝率預測"
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
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg ai-gradient">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wider">FURLONG</div>
              <div className="text-[10px] text-text-subtle tracking-widest">
                RACE INTELLIGENCE
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-bg-elevated text-text"
                      : "text-text-muted hover:bg-bg-elevated hover:text-text",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}
