import type { Profile, ReminderConfig } from "../types";

function parseEnv(json: string): Record<string, string> {
  try {
    const parsed = JSON.parse(json);
    return parsed?.env ?? {};
  } catch {
    return {};
  }
}

export interface PeakInfo {
  inPeak: boolean;
  /** Active time range label, e.g. "09:00 – 12:00" */
  label: string | null;
}

/** Check if a profile is currently in a peak pricing period, and return the active range. */
export function getPeakInfo(
  profile: Profile,
  configs: ReminderConfig[],
  now: Date,
): PeakInfo {
  const env = parseEnv(profile.settings_json);
  const baseUrl = (env.ANTHROPIC_BASE_URL ?? "").trim();
  if (!baseUrl) return { inPeak: false, label: null };

  let hostname: string;
  try {
    hostname = new URL(baseUrl).hostname;
  } catch {
    return { inPeak: false, label: null };
  }

  const cfg = configs.find(
    (c) => c.enabled && hostname.includes(c.vendor_key),
  );
  if (!cfg) return { inPeak: false, label: null };

  // Check day of week: 1=Mon … 7=Sun
  const jsDay = now.getDay(); // 0=Sun
  const weekday = String(jsDay === 0 ? 7 : jsDay);
  if (!cfg.days_of_week.split(",").map((d) => d.trim()).includes(weekday)) {
    return { inPeak: false, label: null };
  }

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const hhmm = `${hh}:${mm}`;

  const ranges: [string | null, string | null][] = [
    [cfg.time1_start, cfg.time1_end],
    [cfg.time2_start, cfg.time2_end],
  ];
  for (const [start, end] of ranges) {
    if (start && end && hhmm >= start && hhmm <= end) {
      return { inPeak: true, label: `${start} – ${end}` };
    }
  }

  return { inPeak: false, label: null };
}