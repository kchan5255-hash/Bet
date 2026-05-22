import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "服務條款 — Furlong",
  description: "Furlong 賽馬數據分析平台的使用條款、用戶責任及法律聲明。",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "2026-05-22";

export default function TermsPage() {
  return (
    <LegalLayout
      title="服務條款"
      subtitle="使用 Furlong 即表示你同意以下條款。請仔細閱讀。"
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection id="nature" title="1. 服務性質">
        <p>
          Furlong 是一個提供香港賽馬量化分析資訊的平台，內容包括但不限於賽事預測、歷史數據、模型評分與盈虧回測。
        </p>
        <p>
          <strong className="text-text">本網站並非投注平台</strong>，不接受、處理或代理任何形式的投注。
          所有實際投注須透過香港賽馬會或其他合法持牌博彩機構進行，並由用戶自行負責。
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="2. 使用資格">
        <p>使用本網站須符合以下條件：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>年滿 18 歲或以上。</li>
          <li>所在地區法律允許瀏覽賽馬相關資訊及進行賽馬投注。</li>
          <li>提供的登記資料真實、準確、最新。</li>
        </ul>
        <p>
          若你不符合上述任何一項條件，請立即停止使用本網站。
        </p>
      </LegalSection>

      <LegalSection id="account" title="3. 帳戶與安全">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>你應妥善保管帳戶密碼，所有經由你帳戶進行的操作將被視為你本人的行為。</li>
          <li>如懷疑帳戶被未經授權使用，請立即聯絡我們。</li>
          <li>禁止與他人共用帳戶、轉售訂閱權利或以自動化程式存取本網站。</li>
        </ul>
      </LegalSection>

      <LegalSection id="subscription" title="4. 訂閱與付款">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>付費訂閱詳情、價格與內容會列於訂閱頁面。</li>
          <li>所有付款一經完成，除法律規定或本網站另有承諾外，不設退款。</li>
          <li>本網站保留調整訂閱內容、價格及供應之權利，重大變更將事先通知。</li>
        </ul>
      </LegalSection>

      <LegalSection id="conduct" title="5. 用戶行為">
        <p>使用本網站時，你同意不會：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>違反任何適用法律、規例或第三方權利。</li>
          <li>嘗試入侵、破壞或干擾本網站系統或其他用戶。</li>
          <li>大量爬取、複製或散布本網站內容作商業用途。</li>
          <li>冒充他人或提供虛假資料。</li>
          <li>用本網站內容作違法、不道德或誤導性之用。</li>
        </ul>
      </LegalSection>

      <LegalSection id="ip" title="6. 知識產權">
        <p>
          本網站所有內容，包括但不限於文字、模型、評分、圖表、介面設計、商標及程式碼，
          均為本網站或其授權人所擁有，並受香港及國際著作權法保護。
        </p>
        <p>
          未經事先書面同意，不得複製、修改、分發、公開展示或用於商業用途。
          引用統計資料時請註明出處。
        </p>
      </LegalSection>

      <LegalSection id="thirdparty" title="7. 第三方資料">
        <p>
          本網站使用之賽事資料來源包括香港賽馬會公開資料及其他公共來源。
          本網站非賽馬會官方平台，亦未獲其背書、認可或合作。
          所有商標歸其各自擁有人所有。
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="8. 免責聲明">
        <p>
          本網站之預測、評分及分析<strong className="text-text">僅供參考</strong>，
          不構成任何形式之投注建議、財務建議或投資建議。
          歷史回測結果不代表未來表現，賽馬投注涉及高度不確定性，可能造成全部或部分本金損失。
        </p>
        <p>
          本網站按「現況」（as-is）提供服務，不就準確性、完整性、即時性或可用性作任何明示或默示保證。
          詳細投注風險聲明請參閱{" "}
          <a
            className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            href="/disclaimer"
          >
            免責聲明
          </a>
          。
        </p>
      </LegalSection>

      <LegalSection id="limitation" title="9. 責任限制">
        <p>
          在法律允許之最大範圍內，本網站、其營運者及關聯方不就以下事項承擔任何責任：
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>用戶根據本網站內容所作之任何投注決定及其後果。</li>
          <li>因使用或無法使用本網站所產生之直接、間接、附帶或衍生損失。</li>
          <li>第三方服務（包括但不限於 Google AdSense、Supabase、Vercel）之中斷或錯誤。</li>
          <li>因網絡攻擊、系統故障、不可抗力導致之資料遺失或損害。</li>
        </ul>
      </LegalSection>

      <LegalSection id="termination" title="10. 終止">
        <p>
          如你違反本條款，本網站有權在不另行通知下暫停或終止你的帳戶。
          終止後，相關條款（包括知識產權、免責聲明、責任限制）將繼續有效。
        </p>
      </LegalSection>

      <LegalSection id="modifications" title="11. 條款修訂">
        <p>
          本網站可能不時修訂本條款。重大變更將於本頁面更新日期，並於必要時通過電郵或網站公告通知。
          若你在條款變更後繼續使用本網站，即視為接受變更後之條款。
        </p>
      </LegalSection>

      <LegalSection id="law" title="12. 適用法律與管轄">
        <p>
          本條款受香港特別行政區法律管轄並依其解釋。
          因本條款引起或與其有關之任何爭議，雙方同意提交香港法院為非專屬管轄法院。
        </p>
      </LegalSection>

      <LegalSection id="contact" title="13. 聯絡我們">
        <p>
          如對本條款有任何疑問，請前往{" "}
          <a
            className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            href="/contact"
          >
            聯絡頁
          </a>
          。
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
