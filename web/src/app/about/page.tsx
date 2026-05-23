import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Cpu,
  LineChart,
  Database,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "關於 Furlong",
  description:
    "Furlong 是一個獨立的香港賽馬量化分析平台。本頁介紹我們的方法論、資料來源、模型演進與立場：以數據呈現賽事資訊，不構成投注建議。",
  alternates: { canonical: "/about" },
};

const PILLARS = [
  {
    icon: Database,
    title: "公開資料 + 自建資料庫",
    desc: "整合香港賽馬會公開賽事資料、派彩資料及馬匹往績，建立可重現的歷史資料庫，支援回測與分析。",
  },
  {
    icon: Cpu,
    title: "量化模型",
    desc: "結合 14 項特徵因子（評分、距離、擋位、體重、騎師組合等），以加權評分及分層篩選方式排序候選馬匹。",
  },
  {
    icon: LineChart,
    title: "歷史回測",
    desc: "以 walk-forward 方式於 2024 年起的賽事資料上回測，量化模型表現、ROI 與最大回撤等指標，定期記錄與更新。",
  },
  {
    icon: ShieldCheck,
    title: "資訊呈現，非投注建議",
    desc: "本網站不接受投注、不代理開戶。所有預測僅為資訊性質，使用者須自行判斷，並承擔自身決定之後果。",
  },
];

const TIMELINE = [
  { ver: "Pro", focus: "基礎 14 特徵因子加權，4 個評分組" },
  { ver: "V6", focus: "Beta-Binomial 動態 shrinkage、自適應 softmax 溫度" },
  { ver: "V9", focus: "百分位相對評分、場內排序" },
  { ver: "V12", focus: "Tier S/A/B 分層、多重 gate 過濾" },
  { ver: "V17", focus: "評分變動、最近落敗距離 gate" },
  { ver: "V18", focus: "賽事級特徵：騎師×練馬師、體重急變警號" },
  { ver: "V19", focus: "距離過濾，跳過低 EV 距離、加成特定距離" },
];

const FAQS = [
  {
    q: "這是投注網站嗎？",
    a: "不是。Furlong 是獨立的香港賽馬量化分析平台，不接受投注、不撮合投注，也不與任何博彩機構從屬。",
  },
  {
    q: "我可以依靠這些預測下注嗎？",
    a: "不建議。所有模型輸出為統計分析結果，不構成投注、財務或投資建議。歷史回測表現不代表未來結果，使用者須自行判斷並承擔自身決定之後果。",
  },
  {
    q: "預測準確度如何計算？",
    a: "採用 Walk-forward 回測：模型於每場賽事使用該日之前的歷史資料訓練，賽後驗證命中率、ROI、最大回撤等指標。完整回測結果公開於「歷史記錄」頁。",
  },
  {
    q: "數據來源是什麼？",
    a: "公開的香港賽馬會賽事資料，加上自建的歷史結構化資料庫。我們並非 HKJC 官方或任何附屬機構。",
  },
  {
    q: "與香港賽馬會有關係嗎？",
    a: "沒有任何從屬、贊助或商業合作關係。Furlong 為獨立第三方研究與資訊呈現平台。",
  },
  {
    q: "如何聯絡你們？",
    a: "請瀏覽「聯絡我們」頁查看電郵與聯絡方式，內容糾錯、私隱查詢與一般查詢均可透過該頁提交。",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-subtle hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        返回首頁
      </Link>

      <header className="mb-10 border-b border-border-subtle pb-7">
        <p className="text-[11px] font-bold uppercase tracking-widest text-text-subtle">
          About
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          以<span className="ai-text-gradient"> 量化方法 </span>
          理解香港賽馬
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted md:text-base">
          Furlong 是一個獨立營運的香港賽馬量化分析平台。
          我們相信賽馬資料公開、規律可循，能透過統計與機器學習方法把資料整理為更易理解的形式。
          本網站提供資訊與分析，並不構成投注建議或財務建議。
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="bento-card bento-card-hover p-5"
          >
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-precision/30 bg-precision/10 text-precision-glow">
              <p.icon className="h-4 w-4" aria-hidden />
            </div>
            <h2 className="text-base font-bold">{p.title}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
              {p.desc}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
          模型演進
        </h2>
        <p className="mt-1 text-[12px] text-text-subtle">
          從基礎特徵到分層篩選與賽事級評分，模型隨資料增長持續迭代。
        </p>
        <ul className="mt-5 space-y-2">
          {TIMELINE.map((t) => (
            <li
              key={t.ver}
              className="flex items-baseline gap-3 rounded-lg border border-border-subtle bg-bg-card/40 px-4 py-3"
            >
              <span className="number-mono w-12 shrink-0 text-sm font-bold text-precision-glow">
                {t.ver}
              </span>
              <span className="text-[13px] text-text-muted">{t.focus}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-xl border border-warning/30 bg-warning/[0.06] p-5">
        <h2 className="text-sm font-bold text-text">立場與限制</h2>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-text-muted">
          <li>· 本網站獨立營運，與香港賽馬會無從屬關係。</li>
          <li>· 模型結果為統計分析，不構成投注、財務或投資建議。</li>
          <li>· 歷史回測表現不代表未來結果。</li>
          <li>· 所有實際投注須透過合法持牌機構進行，並由用戶自負盈虧。</li>
          <li>
            · 詳情請參閱{" "}
            <Link
              href="/disclaimer"
              className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            >
              免責聲明
            </Link>
            。
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
          常見問題
        </h2>
        <p className="mt-1 text-[12px] text-text-subtle">
          關於本網站定位、資料來源與使用方式的常見問答。
        </p>
        <div className="mt-5 space-y-2">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-border-subtle bg-bg-card/40 px-4 py-3 open:bg-bg-card/60"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-text">
                <span>{item.q}</span>
                <span
                  aria-hidden
                  className="text-text-subtle transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-[12px] leading-relaxed text-text-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/races"
          className="inline-flex items-center gap-2 rounded-xl ai-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90"
        >
          查看本期預測
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-5 py-2.5 text-sm font-semibold text-text-muted hover:text-text hover:border-text-muted"
        >
          聯絡我們
        </Link>
      </section>
    </div>
  );
}
