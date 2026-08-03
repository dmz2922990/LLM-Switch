import i18n from "../i18n";

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** e.g. "刚刚" / "3分钟前" / "2小时前" / "5天前" — follows current i18n language. */
export function formatRelativeTime(iso: string): string {
  const ms = new Date(iso).getTime();
  if (!ms) return "-";
  const diffSec = Math.round((ms - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" });

  if (Math.abs(diffSec) < 60) return rtf.format(0, "second");

  for (const [unit, secs] of RELATIVE_UNITS) {
    if (Math.abs(diffSec) >= secs) {
      return rtf.format(Math.round(diffSec / secs), unit);
    }
  }
  return rtf.format(Math.round(diffSec / 60), "minute");
}

/** Truncate a string to n chars with ellipsis. */
export function truncate(s: string, n: number): string {
  if (!s || s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}
