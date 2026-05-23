import type { Metadata } from "next";
import { AlertTriangle, Phone, ExternalLink } from "lucide-react";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "免責聲明 — Furlong",
  description:
    "Furlong 賽馬數據分析平台之投注風險、預測限制及責任聲明。年滿 18 歲方可瀏覽。",
  alternates: { canonical: "/disclaimer" },
};

const LAST_UPDATED = "2026-05-22";

export default function DisclaimerPage() {
  return (
    <LegalLayout
      title="免責聲明"
      subtitle="本網站僅提供賽馬量化分析資訊，不構成投注、財務或投資建議。請仔細閱讀以下風險提示。"
      lastUpdated={LAST_UPDATED}
    >
      <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-warning"
            aria-hidden
          />
          <div className="space-y-1.5 text-[13px] leading-relaxed text-text">
            <p className="font-semibold">
              本網站僅供 18 歲或以上之香港居民閱覽。
            </p>
            <p className="text-text-muted">
              賽馬投注涉及財務風險，可能造成全部或部分本金損失。請理性投注，量力而為。
            </p>
          </div>
        </div>
      </div>

      <LegalSection id="purpose" title="1. 資訊性質">
        <p>
          Furlong（下稱「本網站」）是一個提供香港賽馬<strong className="text-text">量化分析資訊</strong>的平台。
          所有預測、評分、Tier 分級、四大數據排序等內容，均為基於歷史數據及統計模型之分析結果。
        </p>
        <p>本網站內容：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-text">不構成</strong>任何形式之投注建議、財務建議或投資建議；
          </li>
          <li>
            <strong className="text-text">不保證</strong>任何馬匹之表現、勝出機會或回報；
          </li>
          <li>
            <strong className="text-text">不應</strong>被視為唯一決策依據。
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="backtest" title="2. 歷史回測之限制">
        <p>
          本網站可能展示模型之歷史回測表現（例如 ROI、命中率、累積盈虧、最大回撤等）。請注意：
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-text">歷史表現不代表未來結果</strong>。
            過往的盈利不保證將來獲利，過往的命中率不保證將來命中。
          </li>
          <li>
            模型表現可能因賽事規則、馬匹陣容、賽道狀況、經濟環境等因素而有變化。
          </li>
          <li>
            回測係在已知賽果條件下進行的計算結果，實際投注時的情況可能不同。
          </li>
          <li>
            數據可能存在延遲、錯漏或缺失，本網站不保證其完整性與即時性。
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="risk" title="3. 投注風險">
        <p>賽馬投注涉及高度不確定性，常見風險包括但不限於：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>本金損失：可能損失全部或部分投注金額。</li>
          <li>連敗風險：即使長期 ROI 為正，仍可能出現連續虧損期。</li>
          <li>流動性風險：賠率會因市場供求大幅變動。</li>
          <li>成癮風險：頻繁投注可能引致財務、家庭或心理問題。</li>
        </ul>
        <p>
          投注應為娛樂消遣，<strong className="text-text">切勿借貸投注</strong>或投注超出個人可承受損失的金額。
        </p>
      </LegalSection>

      <LegalSection id="not-platform" title="4. 並非投注平台">
        <p>
          本網站<strong className="text-text">並非</strong>投注平台，
          不接受、處理或代理任何形式之投注，亦不持有任何博彩牌照。
        </p>
        <p>
          所有實際投注須透過<strong className="text-text">香港賽馬會</strong>或其他合法持牌博彩機構進行，並由用戶自行負責。
          香港境內透過非持牌途徑進行賭博活動屬違法行為。
        </p>
      </LegalSection>

      <LegalSection id="not-affiliated" title="5. 與賽馬會無關">
        <p>
          Furlong 為獨立第三方分析平台，<strong className="text-text">並非</strong>香港賽馬會官方網站或附屬網站，
          亦未獲香港賽馬會之背書、認可、授權或合作。
        </p>
        <p>
          本網站使用之賽事數據源自香港賽馬會公開資料及其他公共來源。
          所有商標、標誌及賽事名稱歸其各自擁有人所有。
        </p>
      </LegalSection>

      <LegalSection id="responsibility" title="6. 用戶責任">
        <p>用戶在使用本網站內容時，須自行承擔以下責任：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>確認所在地區法律允許瀏覽賽馬資訊及進行賽馬投注。</li>
          <li>核實所有資訊之準確性，避免單一依賴本網站內容作決策。</li>
          <li>自行判斷投注金額及承受風險之能力。</li>
          <li>遵守適用之法律、規例與道德標準。</li>
        </ul>
      </LegalSection>

      <LegalSection id="liability" title="7. 責任限制">
        <p>
          在法律允許之最大範圍內，本網站、其營運者及關聯方
          <strong className="text-text">不就以下事項承擔任何責任</strong>：
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>用戶根據本網站內容所作任何投注決定產生之盈虧。</li>
          <li>因依賴本網站資訊而產生之直接、間接、附帶、衍生或懲罰性損失。</li>
          <li>因資料延遲、錯誤或服務中斷造成之損失。</li>
          <li>第三方廣告所宣傳產品或服務之品質、合法性與後果。</li>
        </ul>
      </LegalSection>

      <LegalSection id="help" title="8. 求助與防止賭博成癮">
        <p>
          如你或你身邊的人因賭博而出現財務、家庭、情緒或健康問題，請及時尋求協助。
        </p>
        <div className="rounded-lg border border-precision/30 bg-precision/[0.05] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Phone className="h-4 w-4 text-precision-glow" aria-hidden />
            <span className="text-sm font-bold text-text">香港求助熱線</span>
          </div>
          <ul className="space-y-1.5 text-[13px]">
            <li>
              <strong className="text-text">平和基金戒賭輔導熱線：</strong>
              <a
                href="tel:18346330"
                className="number-mono text-precision-glow underline underline-offset-2 hover:opacity-80"
              >
                1834 633
              </a>{" "}
              （24 小時）
            </li>
            <li>
              <strong className="text-text">明愛展晴中心：</strong>
              <a
                href="tel:18348488"
                className="number-mono text-precision-glow underline underline-offset-2 hover:opacity-80"
              >
                1834 8488
              </a>
            </li>
            <li>
              <strong className="text-text">東華三院平和坊：</strong>
              <a
                href="tel:27770010"
                className="number-mono text-precision-glow underline underline-offset-2 hover:opacity-80"
              >
                2777 0010
              </a>
            </li>
            <li className="flex items-center gap-1.5">
              <ExternalLink className="h-3 w-3 text-text-subtle" aria-hidden />
              <a
                href="https://www.hkjc.com/responsible-gambling/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-precision-glow underline underline-offset-2 hover:opacity-80"
              >
                香港賽馬會「有節制博彩」資訊
              </a>
            </li>
          </ul>
        </div>
      </LegalSection>

      <LegalSection id="acceptance" title="9. 同意條款">
        <p>
          使用本網站即表示你已閱讀、理解並同意本免責聲明及{" "}
          <a
            className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            href="/terms"
          >
            服務條款
          </a>
          、
          <a
            className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            href="/privacy"
          >
            私隱政策
          </a>
          。 若不同意任何條款，請立即停止使用本網站。
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
