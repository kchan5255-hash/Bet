import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, ShieldAlert, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "聯絡我們 — Furlong",
  description:
    "聯絡 Furlong：使用問題、私隱查詢、內容糾錯、廣告合作或商務合作建議。",
  alternates: { canonical: "/contact" },
};

const CONTACT_EMAIL = "furlong.contact@gmail.com";

const TOPICS = [
  {
    icon: MessageSquare,
    title: "使用問題",
    desc: "登入、訂閱、預測資料、頁面顯示等。",
  },
  {
    icon: ShieldAlert,
    title: "私隱與資料",
    desc: "查閱、更正或刪除個人資料；行使私隱條例下的權利。",
  },
  {
    icon: Mail,
    title: "內容糾錯與合作",
    desc: "資料錯誤回報、廣告合作、商務查詢、媒體聯絡。",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-subtle hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        返回首頁
      </Link>

      <header className="mb-8 border-b border-border-subtle pb-6">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          聯絡我們
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          有疑問、建議或合作意向？請透過下列方式與我們聯絡，我們會在合理時間內回覆。
        </p>
      </header>

      <section className="bento-card p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ai-gradient">
            <Mail className="h-5 w-5 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
              電郵
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-1 inline-block text-base font-semibold text-precision-glow underline underline-offset-2 hover:opacity-80 md:text-lg"
            >
              {CONTACT_EMAIL}
            </a>
            <p className="mt-2 text-[12px] text-text-subtle">
              來信時請註明主題（使用問題 / 私隱 / 合作 等），我們會盡力於 5 個工作日內回覆。
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
          可協助的範疇
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {TOPICS.map((t) => (
            <li
              key={t.title}
              className="rounded-xl border border-border-subtle bg-bg-card/60 p-4"
            >
              <t.icon
                className="mb-2 h-4 w-4 text-precision-glow"
                aria-hidden
              />
              <h3 className="text-[13px] font-bold text-text">{t.title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-text-subtle">
                {t.desc}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-xl border border-warning/30 bg-warning/[0.06] p-4 md:p-5">
        <h2 className="text-sm font-bold text-text">關於投注查詢</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">
          本網站僅提供賽馬量化分析資訊，並非投注平台，無法處理投注、派彩或開戶查詢。
          相關事務請逕向香港賽馬會或其他合法持牌機構查詢。
          如有賭博相關困擾，請致電平和基金戒賭輔導熱線{" "}
          <a
            href="tel:18346330"
            className="number-mono text-precision-glow underline underline-offset-2 hover:opacity-80"
          >
            1834 633
          </a>
          （24 小時）。
        </p>
      </section>
    </div>
  );
}
