import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ReminderConfig } from "../types";
import { api } from "../api";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

interface Props {
  configs: ReminderConfig[];
  onChanged: () => void;
}

/** Parse user input into HH:MM: "9"→"09:00", "930"→"09:30", "0930"→"09:30", "14:3"→"14:30" */
function normalizeTime(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (!digits) return null;
  let h: number;
  let m: number;
  if (digits.length <= 2) {
    h = parseInt(digits, 10);
    m = 0;
  } else if (digits.length === 3) {
    h = parseInt(digits[0], 10);
    m = parseInt(digits.slice(1), 10);
  } else {
    h = parseInt(digits.slice(0, 2), 10);
    m = parseInt(digits.slice(2), 10);
  }
  if (h > 23) h = 23;
  if (m > 59) m = 59;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function ReminderConfigList({ configs, onChanged }: Props) {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Record<string, ReminderConfig>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(() => {
    const d: Record<string, ReminderConfig> = {};
    for (const c of configs) d[c.id] = { ...c };
    setDrafts(d);
  }, [configs]);

  const commit = useCallback(async (id: string) => {
    const cfg = draftsRef.current[id];
    if (!cfg) return;
    const orig = configs.find((c) => c.id === id);
    if (!orig) return;
    if (
      cfg.enabled === orig.enabled &&
      cfg.time1_start === orig.time1_start && cfg.time1_end === orig.time1_end &&
      cfg.time2_start === orig.time2_start && cfg.time2_end === orig.time2_end &&
      cfg.days_of_week === orig.days_of_week &&
      cfg.auto_close === orig.auto_close &&
      cfg.auto_close_seconds === orig.auto_close_seconds
    ) return;
    setSaving(id);
    try {
      await api.reminder.updateConfig(
        id, cfg.enabled, cfg.time1_start, cfg.time1_end,
        cfg.time2_start, cfg.time2_end, cfg.days_of_week,
        cfg.auto_close, cfg.auto_close_seconds,
      );
      onChanged();
    } catch (e: any) { alert(e.toString()); }
    finally { setSaving(null); }
  }, [configs, onChanged]);

  const update = (id: string, patch: Partial<ReminderConfig>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const toggleDay = (id: string, day: number) => {
    const cfg = draftsRef.current[id];
    if (!cfg) return;
    const days = cfg.days_of_week.split(",").map((d) => d.trim()).filter(Boolean);
    const idx = days.indexOf(String(day));
    if (idx >= 0) days.splice(idx, 1);
    else days.push(String(day));
    days.sort((a, b) => Number(a) - Number(b));
    update(id, { days_of_week: days.join(",") });
  };

  return (
    <div className="reminder-config-list">
      {configs.map((c) => {
        const cfg = drafts[c.id];
        if (!cfg) return null;
        return (
          <div key={c.id} className="reminder-card">
            <div className="reminder-card-head">
              <span className="reminder-vendor-name">{c.vendor_name}</span>
              <span className="reminder-vendor-key">{c.vendor_key}</span>
              <button
                type="button"
                role="switch"
                aria-checked={cfg.enabled}
                className={`switch${cfg.enabled ? " is-on" : ""}`}
                onClick={() => { update(c.id, { enabled: !cfg.enabled }); setTimeout(() => commit(c.id), 0); }}
                disabled={saving === c.id}
              >
                <span className="switch-thumb" />
              </button>
            </div>
            {cfg.enabled && (
              <div className="reminder-card-body">
                {[1, 2].map((n) => {
                  const start = n === 1 ? cfg.time1_start : cfg.time2_start;
                  const end = n === 1 ? cfg.time1_end : cfg.time2_end;
                  const startKey = n === 1 ? "time1_start" : "time2_start";
                  const endKey = n === 1 ? "time1_end" : "time2_end";
                  return (
                    <div key={n} className="reminder-row">
                      <label className="reminder-label">{t("reminder.time")} {n}</label>
                      <input type="text" value={start ?? ""} className="reminder-time-input"
                        placeholder="HH:MM" maxLength={5}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9:]/g, "").slice(0, 5);
                          update(c.id, { [startKey]: v || null } as Partial<ReminderConfig>);
                        }}
                        onBlur={() => {
                          const cur = draftsRef.current[c.id];
                          const val = (cur?.[startKey as keyof ReminderConfig] as string) ?? "";
                          const normalized = normalizeTime(val);
                          if (normalized !== val) update(c.id, { [startKey]: normalized } as Partial<ReminderConfig>);
                          commit(c.id);
                        }} />
                      <span className="reminder-range-sep">–</span>
                      <input type="text" value={end ?? ""} className="reminder-time-input"
                        placeholder="HH:MM" maxLength={5}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9:]/g, "").slice(0, 5);
                          update(c.id, { [endKey]: v || null } as Partial<ReminderConfig>);
                        }}
                        onBlur={() => {
                          const cur = draftsRef.current[c.id];
                          const val = (cur?.[endKey as keyof ReminderConfig] as string) ?? "";
                          const normalized = normalizeTime(val);
                          if (normalized !== val) update(c.id, { [endKey]: normalized } as Partial<ReminderConfig>);
                          commit(c.id);
                        }} />
                    </div>
                  );
                })}
                <div className="reminder-row">
                  <label className="reminder-label">{t("reminder.days")}</label>
                  <div className="reminder-days">
                    {WEEKDAYS.map((d) => (
                      <button
                        type="button"
                        key={d}
                        className={`reminder-day-btn${cfg.days_of_week.split(",").includes(String(d)) ? " is-on" : ""}`}
                        onClick={() => { toggleDay(c.id, d); setTimeout(() => commit(c.id), 100); }}
                      >
                        {t(`reminder.day${d}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
