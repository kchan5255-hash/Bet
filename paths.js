// paths.js — 集中所有資料檔的路徑解析
// 整理後資料分散到 data/ 子目錄，本模組同時支援 fallback 至根目錄（兼容舊檔殘留）。

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');

const DIRS = {
  results: path.join(DATA, 'results'),
  backtest: path.join(DATA, 'backtest'),
  dividends: path.join(DATA, 'dividends'),
  horses: path.join(DATA, 'horses'),
  merged: path.join(DATA, 'merged'),
  misc: path.join(DATA, 'misc'),
};

function yearOf(date) {
  return String(date).slice(0, 4);
}

// 嘗試多個候選路徑，回傳第一個存在的；若全部不存在，回傳第一個（呼叫者可自行決定）
function pickExisting(candidates) {
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function resultsFullPath(date) {
  return pickExisting([
    path.join(DIRS.results, yearOf(date), `results-full-${date}.json`),
    path.join(ROOT, `results-full-${date}.json`),
  ]);
}

function backtestPath(model, date) {
  // model: 'pro' | 'v6' | 'v9'
  const filename = model === 'pro' ? `backtest-${date}.json` : `backtest-${model}-${date}.json`;
  return pickExisting([
    path.join(DIRS.backtest, model, yearOf(date), filename),
    path.join(ROOT, filename),
  ]);
}

function dividendsPath(date) {
  return pickExisting([
    path.join(DIRS.dividends, yearOf(date), `dividends-${date}.json`),
    path.join(ROOT, `dividends-${date}.json`),
  ]);
}

function horsesPath(name) {
  // name 可能是檔名（如 horses-all.json）或完整路徑
  if (path.isAbsolute(name)) return name;
  if (name.includes(path.sep) || name.includes('/')) return path.resolve(ROOT, name);
  return pickExisting([
    path.join(DIRS.horses, name),
    path.join(ROOT, name),
  ]);
}

function miscPath(name) {
  return pickExisting([
    path.join(DIRS.misc, name),
    path.join(ROOT, name),
  ]);
}

function mergedPath(name) {
  return pickExisting([
    path.join(DIRS.merged, name),
    path.join(ROOT, name),
  ]);
}

// 寫入專用：總是寫到 data/ 結構底下（新檔不再落到根目錄）
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resultsFullWritePath(date) {
  const dir = ensureDir(path.join(DIRS.results, yearOf(date)));
  return path.join(dir, `results-full-${date}.json`);
}

function resultsPreRacePath(date) {
  return path.join(DATA, 'results-pre', yearOf(date), `results-full-pre-${date}.json`);
}

function resultsPreRaceWritePath(date) {
  const dir = ensureDir(path.join(DATA, 'results-pre', yearOf(date)));
  return path.join(dir, `results-full-pre-${date}.json`);
}

function backtestWritePath(model, date) {
  const dir = ensureDir(path.join(DIRS.backtest, model, yearOf(date)));
  const filename = model === 'pro' ? `backtest-${date}.json` : `backtest-${model}-${date}.json`;
  return path.join(dir, filename);
}

function dividendsWritePath(date) {
  const dir = ensureDir(path.join(DIRS.dividends, yearOf(date)));
  return path.join(dir, `dividends-${date}.json`);
}

function horsesWritePath(name) {
  if (path.isAbsolute(name) || name.includes(path.sep) || name.includes('/')) {
    return path.resolve(ROOT, name);
  }
  return path.join(ensureDir(DIRS.horses), name);
}

module.exports = {
  ROOT,
  DIRS,
  resultsFullPath,
  backtestPath,
  dividendsPath,
  horsesPath,
  miscPath,
  mergedPath,
  resultsFullWritePath,
  resultsPreRacePath,
  resultsPreRaceWritePath,
  backtestWritePath,
  dividendsWritePath,
  horsesWritePath,
};
