# Bet 模型備份說明

本檔記錄項目歷年所有評分模型的設計邏輯。經過 2026-05 的歷史回測比較後，主目錄只保留三個主力模型：**Pro / V6 / V9**。其餘模型程式碼與 backtest 結果搬入 `.archive/` 保留。

---

## 一、保留的主模型（仍在主目錄）

### 1. Pro — Professional Model（基線評分）

檔案：`web/src/lib/professional-model.ts`（Web 端唯一保留版）

**設計理念：** 純資料模型，不使用即時賠率與派彩。將馬匹特徵分四組加權求和，再經 softmax 轉勝率。

**14 個特徵：** recent / form / courseDistance / course / distance / class / going / rating / draw / weight / freshness / body / career / age

**4 個評分組（權重）：**

| 組別 | 權重 | 內容 |
|---|---|---|
| baseAbility | 40% | recent 0.34 + form 0.22 + rating 0.23 + career 0.14 + age 0.07 |
| suitability | 30% | courseDistance 0.34 + course 0.17 + distance 0.18 + class 0.17 + going 0.14 |
| raceSetup | 20% | draw 0.58 + weight 0.30 + freshness 0.12 |
| condition | 10% | body 0.68 + freshness 0.32 |

**核心機制：**
- Shrinkage 拉低樣本馬向場內均值
- Softmax temperature 4.2（field≤11）/ 4.6（field>11）
- vetPenalty × 1.12 直接扣分

**回測表現：** Top1 命中率 21.12%（5 模型最高）；連贏 Top1+2 ROI **+20.32%**（25 種組合中最賺）

**適用場景：** 獨贏、連贏 Top1+2

---

### 2. V6 — Pro 邏輯升級版

檔案：`model-v6.js`

**對比 Pro 的 5 大改動：**
1. **Career**：Beta-Binomial posterior + log scale（取代簡單 winRate）
2. **Recent form trajectory**：近 3 場 vs 近 4-6 場趨勢調整
3. **Dynamic shrinkage**：強度按 winRate 動態調整
4. **Adaptive softmax temperature**：根據場內 rating variance 調溫
5. **Class-conditional draw weight**：唔同班次擋位影響不一樣

**回測表現：** Top1 命中率 20.79%；連贏 Top1+2 ROI **+18.67%**（接近 Pro）；冠軍入 Top4 = 53.80%

**適用場景：** 賠率依賴小的純資料投注、第二意見

---

### 3. V9 — Percentile-relative 全新評分

檔案：`model-v9.js`

**設計理念：** 完全推倒 V3-V8 演進線，自建特徵評分。不再用絕對分數，改用「場內相對百分位」+ 可信度懲罰（reliability penalty）。

**核心特性：**
- Feature group 重新組織，重點放在場內相對排序而非絕對能力分
- 低樣本馬有額外 reliability penalty
- Risk gate：當歷史 edge 不足時跳過該場（不下注）

**回測表現：**
- 冠軍入 Top4 = **60.07%**（5 模型第一，比第二名高 5.6 個百分點）
- 冠軍入 Top3 = **52.48%**（領先 6.3 個百分點）
- 完美命中前 3/3 入 Top4 = **11.22%**（第一）
- 配合 risk gate 後：ROI **+31.88%**（出注 101 場 / 312 場）

**月度波動極大：**
| 月份 | ROI（gated） |
|---|---|
| 2026-04 | +85.3% |
| 2026-03 | +78.5% |
| 2026-05 | +66.4% |
| 2026-01 | +33.2% |
| 2026-02 | -100% |

**適用場景：** 位置 Q / 三重彩 / 連贏 Box；單獨用要配 risk gate

---

## 二、已移除的模型（搬入 `.archive/`）

### 主版本系列

#### V3 — 基礎奠基版 `archive/model-v3.js`

從零建立的新模型，引入：
- Rating absolute scaling
- Market signal（SP 賠率作信號）
- Class-Step 升退班調整

三模型 ensemble：Original + Professional + Market，每個班次有獨立權重。

**移除原因：** 已被 V6/V8 全面取代，邏輯被併入後續版本。

---

#### V4 — V3 修正版 `.archive/model-v4.js`

保留 Pro 核心，只改 2 處：
- SP 賠率改作 "value signal"（市場隱含 vs 模型概率的 edge）
- 對少 records 但 career 高的冠軍型馬，反向處理 shrinkage

**移除原因：** 修正面太細，被 V6 完整重做取代。

---

#### V5 — Filter 策略版 `.archive/model-v5.js`

不重算分數，沿用 V3 backtest，加入投注過濾器：
- 只在特定條件下注：1650m HV / 1200m / 1400m / 第二/五班，gap 1-3%
- 排除 1000m / 1600m / 2000m / 新馬賽

**移除原因：** Filter 邏輯可內嵌至 V9 risk gate，獨立檔案無存在價值。

---

#### V7 — 獨立 win-prob 模型 `.archive/model-v7.js`

為咗同 V6 比對而獨立建立的勝率模型。Feature 組更細：recent / trend / peak / consistency / form / career / draw / weight / freshness…

**回測表現極差：** 全項目 ROI 負數，獨贏 -35.10% / 連贏 Top3 Box 蝕 $2,867

**移除原因：** 全模型最弱，已被 V8 ensemble 取代再被 V9 完全重做。

---

#### V8 — Profit overlay `.archive/model-v8.js`

V6 為主排序信號 + V7 作確認與風險層。Bet-gated：歷史 edge 不足主動跳過。

**回測表現：** Top1 = 20.13%（輸 V6 0.7 個百分點），連贏 Top1+2 ROI -4.36%

**移除原因：** Overlay 結構未跑贏單純 V6，V9 risk gate 提供更強篩選。

---

#### V10 — 資料導向報告版 `.archive/model-v10-data-score.js`

沿用 V9 特徵抽取，但用更明確 family 分組（formTrend / classAbility / surfaceFit / raceSetup / condition / connections）。純資料模型，不用即時賠率/派彩。

**移除原因：** 與 V9 重疊度高，主要用作報告產生器（`analysis-results-v10-*.json`）；改為 V9 直接輸出。

---

### Professional 變體

#### Professional V1（CLI 版）`.archive/professional-model-comparison.js`

最原始嘅「專業評分」CLI 版，做 oldRank vs newRank 對比輸出。

**移除原因：** 邏輯與 Web TS 版完全一致，重複保留無意義。Web TS 版已留在 `web/src/lib/professional-model.ts`。

---

#### Professional V2 `.archive/professional-model-v2.js`

V1 升級 6 大模組：
1. **Connections group**（騎師/練馬師 4 級分層）
2. **Momentum group**（last 6 加權 + 趨勢）
3. **Gear-change boost**（首戴眼罩/面紗/脷帶加分）
4. **Reliability-aware shrinkage**
5. **非線性 layoff 曲線**（14-21 日 sweet spot）
6. **Vet recovery decay**（過獸醫日數越遠 risk 越小）

**評分組擴 4 → 6：** baseAbility 30% + suitability 22% + raceSetup 14% + condition 8% + connections 8% + momentum 18%

**回測表現：** Top1 命中率 19.47%，反而 **跌過 Pro V1**（21.12%）；冠軍入 Top4 = 52.81%

**移除原因：** 加入 connections / gear-change 等模組未能改善排名準確度，V1 邏輯已足夠。

---

### 冷門馬模型

#### Cold-Burst V3 `.archive/model-cold-burst.js` / `.archive/cold-burst-v3-data.js`

完全獨立模型，用 V9 backtest 作 feature cache，目標係搵冷門馬。

**回測表現：**
- Primary 命中：12.87% 勝率 / 32.34% 入位率
- 「真冷」馬（唔在主流 Top4）只佔 25.7%
- 與 V9 Top4 重疊高達 62%

**移除原因：** 大部分推薦冷門已被 V9 涵蓋，獨立模型價值有限。

---

#### Cold-Potential V1 `.archive/cold-potential-v1.js`

更早期嘅冷門偵測，已被 Cold-Burst V3 取代。

**移除原因：** 更舊版本，Cold-Burst V3 已含同類功能。

---

## 三、模型演進脈絡圖

```
         Pro (Professional V1) ─────────────────── 保留 (web/professional-model.ts)
            ↓ 升級
         Pro V2  ─────────────────── 移除（未跑贏 V1）
            
         V3 (基礎) → V4 (修補) → V5 (filter)  ─── 全部移除
                       ↓
                     V6 (Pro 升級)  ─────────────── 保留
                       ↓
                     V7 → V8 (overlay)  ─── 移除（V7 ROI 全負，V8 唔贏 V6）
                       ↓
                     V9 (推倒重來,百分位)  ────── 保留（最強）
                       ↓
                     V10 (data-score)  ─── 移除（與 V9 重疊高）

         Cold-Potential → Cold-Burst  ─── 移除（與 V9 重疊 62%）
```

---

## 四、最終回測表現對照（樣本 303 場，2026-01-01 至 2026-05-13）

| 模型 | Top1 命中 | 冠軍入 Top3 | 冠軍入 Top4 | 完美 3/3 | 最佳 ROI 投注 |
|---|---|---|---|---|---|
| **Pro** ✅ | **21.12%** | 46.20% | 54.13% | 9.90% | 連贏 Top1+2 +20.32% |
| **V6** ✅ | 20.79% | 45.54% | 53.80% | 9.57% | 連贏 Top1+2 +18.67% |
| **V9** ✅ | 20.79% | **52.48%** | **60.07%** | **11.22%** | Risk-gated +31.88% |
| ProV2 ❌ | 19.47% | 44.88% | 52.81% | 8.25% | — |
| V8 ❌ | 20.13% | 43.56% | 54.46% | 8.58% | 全負 |
| V7 ❌ | 16.67% | — | 51.92% | — | 獨贏 -35.10% |
| Cold-Burst ❌ | 12.87% | 32.34% | — | — | — |

---

## 五、還原方法

如需還原任一已封存模型：

```bash
# 還原 V8（連同其 backtest 結果）
mv .archive/model-v8.js .
mv .archive/backtest-v8-*.json .

# 還原 ProV2
mv .archive/professional-model-v2.js .
mv .archive/professional-model-v2.json .
```

---

最後更新：2026-05-16
