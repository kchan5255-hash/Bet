"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PaywallOverlayProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function PaywallOverlay({
  children,
  title = "升級解鎖 AI 預測",
  description = "訂閱 Pro 方案查看完整 AI 評分、四大數據推介、冷門黑馬、正負因素分析",
  className,
}: PaywallOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none select-none blur-md opacity-40"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-bg/40 via-bg/80 to-bg/95 backdrop-blur-xs">
        <div className="glass rounded-xl p-6 text-center shadow-2xl max-w-sm mx-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ai-gradient animate-pulse-ring">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-base font-bold mb-1">{title}</h3>
          <p className="text-xs text-text-muted mb-4 leading-relaxed">
            {description}
          </p>
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-lg ai-gradient px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:opacity-90 transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            升級解鎖
          </Link>
        </div>
      </div>
    </div>
  );
}
