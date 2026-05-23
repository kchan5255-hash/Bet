# AI Bet — 香港賽馬投注預測系統

## 專案概覽

香港賽馬投注預測系統，Node.js (CommonJS) + Supabase + Puppeteer + Claude API。

- 資料來源：HKJC（香港賽馬會）官網爬取
- 回測範圍：2024-01-07 至今，200+ 賽馬日，2500+ 場
- 語言：繁體中文，風格直接、專業、簡潔

---

## 香港賽馬基礎知識

### 場地

- 沙田（Sha Tin, ST）：大型場地，直路較長，日場為主
- 跑馬地（Happy Valley, HV）：市區場地，彎道多，夜場為主

### 比賽距離

- 常見：1000m / 1200m / 1400m / 1600m / 1800m / 2000m / 2200m
- 特殊：1650m（跑馬地專用）
- V19 跳過：1000m / 1650m / 2000m / 2200m（三年回測皆負）
- V19 加成：1400m / 1600m（+1.5 分，強 alpha）

### 班次（Class）

- Class 1（最高）→ Class 5（最低）
- Griffin Race：新馬賽（未有官方評分的馬）
- 班次越低，馬匹實力越參差，預測難度越高

### 擋位（Draw）

- 內檔 1-4：有利（跑道較短）
- 中檔 5-10：中性
- 外檔 11+：不利（需跑更多路）

### 體重（Body Weight）

- 馬匹實際體重（磅）
- 急變 >30lb 為風險警號（狀態不穩）

### 評分（Official Rating）

- 馬會對馬匹能力的官方數值，越高越強
- Class 1 馬通常 100+
- ratingDelta（5場評分升幅 ≥2）是本系統最強預測信號

---

## 完整投注玩法

### 單場投注池

| 中文 | 英文 | 規則 | 最低注額 |
|------|------|------|---------|
| 獨贏 | Win | 選 1 匹馬，必須第一名 | $10 |
| 位置 | Place | 選 1 匹馬，需在前三名 | $10 |
| 連贏 | Quinella | 選 2 匹馬，任意順序進前二 | $10 |
| 位置Q | Quinella Place | 選 2 匹馬，兩匹都需在前三名 | $10 |
| 二重彩 | Forecast | 選 2 匹馬，指定順序（1st+2nd） | $10 |
| 三重彩 | Tierce | 選 3 匹馬，指定順序（1st+2nd+3rd） | $10 |
| 單T | Trio | 選 3 匹馬，任意順序進前三 | $10 |
| 四連環 | First 4 | 選 4 匹馬，任意順序進前四 | $10 |
| 四重彩 | Quartet | 選 4 匹馬，指定順序（1st+2nd+3rd+4th） | $10 |

### 跨場投注池

| 中文 | 英文 | 規則 | 口數 |
|------|------|------|------|
| 孖寶 | Double | 連續兩場各選一匹冠軍 | 9口（第1-2場至第9-10場） |
| 孖T | Double Trio | 連續兩場各選前三名（任意順序） | 5口（第1-3場至第5-7場） |
| 三寶 | Treble | 連續三場各選一匹冠軍 | 2口（第1-3場、第2-4場） |
| 三T | Triple Trio | 連續三場各選前三名（任意順序） | 滾動式 |
| 六環彩 | Six Up | 最後六場各選冠軍或亞軍，全中有額外獎金 | 1口 |

### 膽拖（Banker）投注

- 適用於：連贏、位置Q、三重彩、單T、四重彩等
- 膽（Banker）：必須入選的馬匹（固定）
- 拖（Leg）：其餘位置的候選馬匹（組合）
- 本系統策略：Top1 為膽，Top2/Top3 為拖，每場 $200

### 派彩比例（馬會抽水後返還）

- 獨贏 / 位置：82.5%
- 連贏 / 位置Q：82.5%
- 二重彩：80.5%
- 單T / 三重彩 / 四連環 / 四重彩 / 三寶：75%
- 三T / 六環彩：75%

---

## 模型特徵說明

| 特徵 | 說明 | 門檻 |
|------|------|------|
| reliability | 可靠度，基於歷史樣本深度的信心指數 | ≥0.50 |
| suitability | 適合度，馬匹對該場比賽的適配度 | ≥0.60 |
| prob | 勝率百分比 | ≥10% |
| drawRel | 擋位相對表現 | ≥0.50 |
| bodyRel | 體重相對表現 | ≥0.50 |
| top1Shape | 頭馬形態 | ≥0.65 |
| ratingDelta | 5場前至今評分升幅（最強信號） | ≥2 |
| distAvgPlace | 同距離比賽平均名次 | 越低越好 |
| last6Avg | 最近6場平均名次 | ≤4 |
| freshnessDays | 距上次比賽天數 | 7-35 |
| lastLBW | 最近一場落敗距離（馬位數） | ≤2 |
| j×t combo | 騎師×練馬師配搭勝率 | elite≥18% / good≥10% |

### LBW（落敗距離）解析

- `N` = 0.05（鼻位）
- `SH` = 0.1（短頭）
- `HD` = 0.2（馬頭）
- 數字 = 馬位數（如 `1.5` = 1.5馬位）

### j×t combo 分級

- `elite`：勝率 ≥18%，加 +3 分
- `good`：勝率 ≥10%，加 +1 分
- `avg`：勝率 ≥6%，中性
- `below`：勝率 <6%，減 -2 分（跳過）

---

## 模型版本架構

| 版本 | 核心改動 | 最佳 ROI |
|------|---------|---------|
| Pro | 基礎模型，14個特徵，4個評分組（baseAbility 40% / suitability 30% / raceSetup 20% / condition 10%） | +8.70% |
| V6 | Pro + Beta-Binomial career + 動態 shrinkage + 自適應 softmax temperature | +18.67% |
| V9 | 百分位相對評分，場內相對排序 + 可信度懲罰 | +31.88% |
| V12 | 分層篩選（Tier S/B），drawRel + bodyRel + top1Shape gate | +79.04% |
| V17 | distAvgPlace + ratingDelta gate + LBW gate | +166.1% |
| V18 | V14 + 賽事級特徵評分（j×t combo / 體重急變警號） | +31.1% |
| V19 | V18 + 距離過濾（跳過 1000/1650/2000/2200m，加成 1400/1600m） | +47.5%（預期） |

### Tier 等級（V18/V19）

- Tier S（score ≥ 3）：最高信心，1.5x 注碼
- Tier A（score 1-3）：標準注碼
- Tier B（score 0-1）：降低注碼 0.7x
- score < 0：跳過

---

## 最佳策略績效（2024-2026 回測）

| 策略 | 場數 | ROI | 盈虧 | 最大回撤 |
|------|------|-----|------|---------|
| V12 Strong 連贏單注 | 99 | +79.04% | +$7,825 | -$5,770 |
| V12 Banker 連贏膽拖 | 177 | +36.94% | +$13,075 | -$8,850 |
| V17-B 連贏單注 | 274 | +166.1% | — | -$5,100 |
| V17-A 連贏單注 | 387 | +155.8% | — | — |
| V19 連贏（預期） | ~531 | +47.5% | +$54,240 | — |

2026 年 V12 爆發：單注 +390.8% ROI（25場）、膽拖 +319.0% ROI（34場）。

---

## 關鍵檔案

| 檔案 | 用途 |
|------|------|
| model-v19.js | 最新模型（V18 + 距離過濾） |
| model-v18.js | 賽事級特徵評分 |
| model-v17.js | 最強 ROI 模型（+166%） |
| model-v12.js | 最強歷史模型（+79%） |
| features-pro.js | 14個特徵計算模塊（共用） |
| paths.js | 資料路徑管理（data/ 結構 + 根目錄 fallback） |
| pnl-engine.js | 盈虧計算引擎（8種投注策略） |
| backtest.js | Walk-forward 回測框架 |
| dividends-scraper.js | 派彩表爬蟲 |
| MODEL_REPORT.md | 完整績效報告 |
| MODEL_BY_YEAR.md | 年度 ROI 對照表 |
| MODELS-ARCHIVE.md | 模型演化史 |

---

## 常用指令

```bash
# 執行預測
node model-v19.js
node model-v19.js 2026-05-20
USE_SUPABASE=1 node model-v19.js 2026-05-20 --skip-if-loaded   # 賽果已入兼算過就 skip

# 回測
DATE=2026-05-09 RESULTS=results-full-2026-05-09.json HORSES=horses-2026-05-09.json node backtest.js

# 計算盈虧
node pnl-engine.js

# 一次性遷移：daily backtest JSON → Supabase v19_predictions
USE_SUPABASE=1 node migrate-backtest-to-supabase.js

# 偵測今日是否賽馬日（auto-update workflow 用）
node detect-race-day.js
DATE_OVERRIDE=2026-05-24 node detect-race-day.js     # 測試指定日
```

---

## 自動化流程

### Auto-Update Workflow（雲端 cron）

[.github/workflows/auto-update.yml](.github/workflows/auto-update.yml) 每 10 分鐘自動觸發（HKT 12:00–23:50）：

1. **detect-race-day.js** — 並行查 HKJC GraphQL（ST + HV），無 raceMeetings 即 exit
2. **比對 postTime + 5min ≤ now()** 且未在 `race_results` table，得出待爬場次
3. **results-full-scraper + dividends-scraper** — 爬 R1...max_race_no（覆寫 idempotent，重試 3 次）
4. **build-race-results-by-date + build-dividends-by-date** — 聚合到前端格式
5. **model-v19.js \<date\>** — 重算當日 V19，upsert 入 `v19_predictions` table
6. **最後一場後** — `export-v19-to-web.js \<date\>` merge 該日入 web/src/data/v19.json
7. **commit & push** — `auto: <date> R3,4 (final + V19 export)`

失敗時 GitHub 自動 email 通知（GitHub user 預設行為，無需配置）。

### Supabase Schema

| Table | 用途 |
|---|---|
| `horse_profiles` / `horse_records` | 馬匹檔案 + 往績（model-v18 用）|
| `race_results` / `race_dividends` | 賽果 + 派彩（auto-update 寫入）|
| `v19_predictions` | V19 模型計算結果（一場一行，UNIQUE date+venue+race_no）|
| `odds` / `race_meta` | 賽前賠率快照 |

[sql/supabase-schema-v19.sql](sql/supabase-schema-v19.sql) 為新增。Schema 演進：先 SQL Editor 執行，再跑 migrate script 灌入歷史資料。

### 增量規則

- **資料層** — 已在 `race_results` 嘅場 detect 唔會再叫 scraper
- **模型層** — `model-v19.js --skip-if-loaded`：賽果齊全 + `v19_predictions` 已有該日 post-mode + actualTop3 非空 → skip

### 手動 Fallback

[.github/workflows/admin-pipeline.yml](.github/workflows/admin-pipeline.yml) 保留 4 個 flow（pre-prediction / results / post-prediction / history-rebuild），workflow_dispatch 手動觸發。auto-update 遇到問題時可由此手動補跑。

舊模型（v9 / v12 / v13 / v14）只在 admin-pipeline post-prediction 跑，日常 auto-update 只跑 V19。

### Odds Refresh Workflow（雲端 cron）

[.github/workflows/odds-refresh.yml](.github/workflows/odds-refresh.yml) 每 5 分鐘觸發（HKT 11:00–23:55）：

1. **detect-odds-window.js** — 並行查 HKJC GraphQL，揾出 `postTime - 30min ≤ now < postTime + 1min` 嘅場
2. **odds-scraper.js**（`RACES=3,4,5` env）— puppeteer 只爬窗口內場次，upsert `odds` + `race_meta`
3. 失敗只 log warn 唔 fail，下一輪 cron 自動 retry

非比賽日 / 唔喺窗口 → workflow 開頭 detect 完即 exit，唔裝 chromium。

同 auto-update concurrency 獨立（group: `odds-refresh`），互不干擾。前端 [use-live-odds.ts](web/src/lib/use-live-odds.ts) 用 Supabase Realtime postgres_changes 自動接收 odds + race_meta 變動。

本機保留 [auto-refresh-odds.js](auto-refresh-odds.js) 做 debug fallback（`npm run odds:auto`）。

---

## 用戶背景

- 20 年專業程式員 + UI/UX 設計師
- 熟悉所有技術細節，無需基礎解釋
- 回應語言：繁體中文，風格直接、專業、簡潔
