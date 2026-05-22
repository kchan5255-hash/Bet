import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: ReactNode;
  locale?: "zh" | "en";
  altLocaleHref?: string;
  altLocaleLabel?: string;
}

const COPY = {
  zh: { back: "返回首頁", lastUpdated: "最後更新" },
  en: { back: "Back to home", lastUpdated: "Last updated" },
} as const;

export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  children,
  locale = "zh",
  altLocaleHref,
  altLocaleLabel,
}: LegalLayoutProps) {
  const copy = COPY[locale];
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-text-subtle hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {copy.back}
        </Link>
        {altLocaleHref && altLocaleLabel && (
          <Link
            href={altLocaleHref}
            className="text-xs text-text-subtle hover:text-text"
          >
            {altLocaleLabel}
          </Link>
        )}
      </div>

      <header className="mb-8 border-b border-border-subtle pb-6">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-text-muted leading-relaxed">
            {subtitle}
          </p>
        )}
        <p className="mt-3 text-[11px] uppercase tracking-widest text-text-subtle">
          {copy.lastUpdated}：{lastUpdated}
        </p>
      </header>

      <article className="legal-article space-y-6 text-sm leading-relaxed text-text-muted">
        {children}
      </article>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="scroll-mt-20 text-base font-bold text-text md:text-lg">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
