export interface DateMeta {
  date: string;
  venue: string;
  venueName: string;
  raceCount: number;
}

export interface MeetingMeta extends DateMeta {
  weekday: string;
}

export function formatMeetingDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export function formatPostTime(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatPostTimeShort(iso: string): string {
  if (!iso) return "";
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(iso)) {
    return iso.replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s*/, "");
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(11, 16);
  return formatPostTime(iso);
}

export function weekdayLabel(date: string): string {
  if (!date) return "";
  const value = new Date(`${date}T00:00:00+08:00`);
  if (Number.isNaN(value.getTime())) return "";
  return ["週日", "週一", "週二", "週三", "週四", "週五", "週六"][value.getDay()];
}
