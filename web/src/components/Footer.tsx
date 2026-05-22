import Link from "next/link";
import { Sparkles, AlertTriangle, Phone } from "lucide-react";

const PRODUCT_LINKS = [
  { href: "/races", label: "本期預測" },
  { href: "/results", label: "賽果派彩" },
  { href: "/history", label: "歷史記錄" },
];

const LEGAL_LINKS = [
  { href: "/about", label: "關於我們" },
  { href: "/disclaimer", label: "免責聲明" },
  { href: "/privacy", label: "私隱政策" },
  { href: "/terms", label: "服務條款" },
  { href: "/contact", label: "聯絡我們" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="border-t border-border-subtle bg-bg-elevated/40 mt-12 pb-24 md:pb-10"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md ai-gradient">
                <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden />
              </div>
              <span className="text-sm font-bold tracking-[0.15em]">
                FURLONG
              </span>
            </Link>
            <p className="mt-3 text-[12px] leading-relaxed text-text-subtle">
              香港賽馬量化分析平台。
              <br />
              基於數據與統計模型。
            </p>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
              產品
            </h3>
            <ul className="mt-3 space-y-2">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-text-muted hover:text-text"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
              法律
            </h3>
            <ul className="mt-3 space-y-2">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-text-muted hover:text-text"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
              負責任博彩
            </h3>
            <div className="mt-3 space-y-2.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] font-bold text-warning">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                18+ 限制
              </div>
              <p className="text-[11px] leading-relaxed text-text-subtle">
                投注涉風險，僅供娛樂。
                <br />
                請理性投注、量力而為。
              </p>
              <a
                href="tel:18346330"
                className="inline-flex items-center gap-1.5 text-[12px] text-precision-glow hover:opacity-80"
              >
                <Phone className="h-3 w-3" aria-hidden />
                <span className="number-mono">戒賭熱線 1834 633</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border-subtle pt-5">
          <div className="flex flex-col items-start justify-between gap-2 text-[11px] text-text-subtle md:flex-row md:items-center">
            <p>© {year} Furlong. 本網站獨立營運，與香港賽馬會無關。</p>
            <p>
              本網站僅提供分析資訊，
              <span className="text-text-muted">並非投注平台</span>。
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
