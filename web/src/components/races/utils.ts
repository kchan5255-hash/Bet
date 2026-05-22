import type { RaceRunnerView } from "@/lib/race-view-types";

export function tierLabel(tier: "S" | "A" | "B"): string {
  if (tier === "S") return "高信心 Tier S";
  if (tier === "A") return "中信心 Tier A";
  return "低信心 Tier B";
}

export function buildBankerPlay(
  qinBanker: { combo: string; label: string }[],
  nameByNo: Map<string, string>,
): {
  banker: { no: string; name: string };
  legs: { no: string; name: string }[];
} | null {
  if (qinBanker.length === 0) return null;
  const pairs = qinBanker
    .map((c) => c.combo.split(",").map((n) => n.trim()))
    .filter((p) => p.length === 2);
  if (pairs.length === 0) return null;

  const counts = new Map<string, number>();
  for (const [a, b] of pairs) {
    counts.set(a, (counts.get(a) ?? 0) + 1);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  let bankerNo = pairs[0][0];
  let max = 0;
  for (const [no, count] of counts) {
    if (count > max) {
      max = count;
      bankerNo = no;
    }
  }
  const legSet = new Set<string>();
  for (const [a, b] of pairs) {
    if (a !== bankerNo) legSet.add(a);
    if (b !== bankerNo) legSet.add(b);
  }
  return {
    banker: { no: bankerNo, name: nameByNo.get(bankerNo) ?? "" },
    legs: Array.from(legSet).map((no) => ({
      no,
      name: nameByNo.get(no) ?? "",
    })),
  };
}

export function buildBoxPlay(
  qinT12: { combo: string; label: string } | null,
  qinBanker: { combo: string; label: string }[],
  nameByNo: Map<string, string>,
): { combos: string[]; combosLabel: string; numbers: string[] } | null {
  const numbers = new Set<string>();
  if (qinT12) {
    qinT12.combo
      .split(",")
      .map((n) => n.trim())
      .forEach((n) => numbers.add(n));
  }
  for (const c of qinBanker) {
    c.combo
      .split(",")
      .map((n) => n.trim())
      .forEach((n) => numbers.add(n));
  }
  const list = Array.from(numbers);
  if (list.length < 2) return null;

  const combos: string[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const aName = nameByNo.get(a) ?? "";
      const bName = nameByNo.get(b) ?? "";
      combos.push(`#${a} ${aName} - #${b} ${bName}`);
    }
  }
  return {
    combos,
    combosLabel: `${list.length} 串 ${combos.length}`,
    numbers: list,
  };
}

export function buildRationale(reasons: string[], boost: string | null): string[] {
  const out: string[] = [];
  for (const raw of reasons) {
    const r = raw.trim();
    const lower = r.toLowerCase();
    if (lower.startsWith("draw=")) continue;
    if (lower.startsWith("class=")) continue;
    if (lower.startsWith("field=")) continue;
    if (lower.startsWith("middle-boost")) continue;

    if (lower === "jt-elite") {
      out.push("騎師×練馬師組合屬精英級（勝率 ≥18%）");
    } else if (lower === "jt-good") {
      out.push("騎師×練馬師組合表現良好（勝率 ≥10%）");
    } else if (lower.startsWith("j-elite")) {
      const m = r.match(/=([\d.]+)%?/);
      out.push(m ? `頭馬騎師勝率 ${m[1]}%（精英級）` : "頭馬騎師屬精英級");
    } else if (lower.startsWith("t-elite")) {
      const m = r.match(/=([\d.]+)%?/);
      out.push(m ? `頭馬練馬師勝率 ${m[1]}%（精英級）` : "頭馬練馬師屬精英級");
    } else {
      out.push(r);
    }
  }
  if (boost === "middle" || boost === "middle-boost" || boost === "middle-boost=1.5") {
    out.push("距離 1400/1600 米 V19 強 alpha 區（+1.5 加成）");
  }
  return out;
}

export function translateGateReason(reason: string | null): string {
  if (!reason) return "本場跳過";
  const lower = reason.toLowerCase();
  if (lower === "no-pick") return "未達推介門檻";
  if (lower === "v18-skip") return "信心度不足";
  if (lower === "unknown-distance") return "距離未知，跳過";
  if (lower.startsWith("bad-distance=")) {
    const m = reason.match(/=(\d+)/);
    return m ? `${m[1]} 米回測 ROI 為負，V19 跳過` : "距離回測為負，V19 跳過";
  }
  return reason;
}

export function buildNameByNo(runners: RaceRunnerView[]): Map<string, string> {
  return new Map(runners.map((r) => [String(r.no), r.name]));
}

export function formatShortTime(value: string): string {
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) {
    return value.replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s*/, "");
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return value;
}
