"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm text-text-muted leading-relaxed">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
        {footer ? (
          <div className="mt-6 text-center text-xs text-text-muted">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FormFeedback({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span className="leading-relaxed">{error}</span>
      </div>
    );
  }
  if (message) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-precision/30 bg-precision/10 px-3 py-2 text-xs text-precision">
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
        <span className="leading-relaxed">{message}</span>
      </div>
    );
  }
  return null;
}

export function SubmitButton({
  pending,
  children,
  variant = "primary",
}: {
  pending?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition",
        variant === "primary"
          ? "ai-gradient text-white"
          : "border border-border bg-bg-subtle text-text-muted hover:border-text-muted hover:text-text",
        pending ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
      )}
    >
      {pending ? "處理中…" : children}
    </button>
  );
}
