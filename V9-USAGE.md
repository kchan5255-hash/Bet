# V9 Percentile-Reliability Model

V9 is a new scoring model, not a V8 parameter tweak.

## Files

- `model-v9.js`: builds `backtest-v9-YYYY-MM-DD.json`
- `compare-v9-profit.js`: evaluates V9 recommendations across stored backtest days
- `compare-v9-bet-types.js`: compares requested Win/QPL/Quinella bet types
- `compare-v9-profit-report.json`: latest generated 31-day report

## Run one day

```powershell
$env:DATE='2026-05-09'
node model-v9.js
```

## Run 31-day profit report

```powershell
$env:REBUILD_V9='1'
node compare-v9-profit.js
```

## Compare Bet Types

```powershell
node compare-v9-bet-types.js
```

This compares:

- Win Top1
- Quinella Place Top1-Top3 box
- Quinella Place Top1-Top2
- Quinella Top1-Top2
- Quinella Top1-Top3 box

`Top1-Top3` is treated as a three-horse box: Top1-Top2, Top1-Top3, Top2-Top3. Stake is 10 per line.

## Scoring Mechanism

V9 builds features directly from horse history and the race card, then converts each feature into a field-relative percentile. Main groups:

- form cycle: recent form, improvement/decline, recent peak, stability
- proven ability: career, rating, age, weight
- suitability: course-distance, course, distance, distance band, class, going
- race shape: draw, pace setup, freshness, body weight
- human edge: jockey and trainer history

The final score applies a reliability penalty for low history depth and weaker specialist evidence.

## Current Gate

V9 recommends one quinella (`連贏`) bet on V9 Top1-Top2 only when:

- field size is at least 10
- distance is 1200m, 1400m, 1650m, or 1800m
- Top1-Top2 probability gap is 0.25 to 4.25 percentage points
- Top2 average reliability is at least 0.45
- Top2 average suitability is at least 0.50

## Current 31-Day Backtest

- evaluated races: 312
- Top4 any placed: 295/312 (94.6%)
- winner in Top4: 188/312 (60.3%)
- Top1 winner: 65/312 (20.8%)
- played races: 101
- stake: 1010
- return: 1332
- profit: 322
- ROI: 31.88%
- max drawdown: -250
- longest losing streak: 25 bets

This is historical and sample-limited. February 2026 was negative in this sample.

## Current Bet-Type Test

All V9 races:

- Win Top1: ROI -23.19%
- QPL Top1-Top3 box: ROI -16.21%
- QPL Top1-Top2: ROI -4.81%
- Quinella Top1-Top2: ROI -16.06%
- Quinella Top1-Top3 box: ROI -4.68%

Current V9 gate only:

- Win Top1: ROI -24.95%
- QPL Top1-Top3 box: ROI -24.26%
- QPL Top1-Top2: ROI +6.44%
- Quinella Top1-Top2: ROI +31.88%
- Quinella Top1-Top3 box: ROI -9.06%
