"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Trophy,
  Sparkles,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/results", icon: Trophy, label: "賽果派彩" },
  { href: "/races", icon: Sparkles, label: "勝率預測", primary: true },
  { href: "/history", icon: Clock, label: "歷史記錄" },
  { href: "/account", icon: MoreHorizontal, label: "帳戶" },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border-subtle bg-bg-elevated/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors",
                active ? "text-precision" : "text-text-muted",
              )}
            >
              <div className="relative flex flex-col items-center gap-1">
                {active && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-precision" />
                )}
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
