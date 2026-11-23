import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { Profile, UsageInfo } from "../types";
import { api } from "../api";
import { IconClock, IconRefresh } from "./icons";

const REFRESH_INTERVAL = 5 * 60 * 1000;

function parseEnv(json: string): Record<string, string> {
  try {
    const parsed = JSON.parse(json);
    return parsed?.env ?? {};
  } catch {
    return {};
  }
}

function getRemainingPct(usedPct: number): number {
  return Math.max(0, Math.min(100, 100 - usedPct));
}

function getBarClass(remainingPct: number): string {
  if (remainingPct <= 10) return "is-danger";
  if (remainingPct <= 30) return "is-warn";
  return "is-ok";
}

// Compact countdown: two-level precision (1天3小时 / 2小时58分钟 / 25分钟 / 即将).
function formatCountdown(ms: number, now: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  const diffMs = ms - now;
  if (diffMs <= 0) return t("usage.resetSoon");
  const totalMin = Math.floor(diffMs / 60000);
  if (totalMin >= 1440) {
    const d = Math.floor(totalMin / 1440);
    if (d > 7) return t("usage.resetDays", { n: d });
    const h = Math.floor((totalMin % 1440) / 60);
    return h > 0
      ? t("usage.resetDH", { d, h })
      : t("usage.resetDays", { n: d });
  }
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0
      ? t("usage.resetHM", { h, m })
      : t("usage.resetHours", { n: h });
  }
  return t("usage.resetMinutes", { n: totalMin });
}

// Exact ISO-ish time for tooltip: YYYY-MM-DD HH:mm
function formatExactTime(ms: number): string {
  if (!ms) return "-";
  const d = new Date(ms);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function UsageDisplay({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [hovered, setHovered] = useState<{ label: string; top: number; left: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const env = parseEnv(profile.settings_json);
  const baseUrl = env.ANTHROPIC_BASE_URL ?? "";
  const authToken = env.ANTHROPIC_AUTH_TOKEN ?? "";

  const fetchUsage = useCallback(async () => {
    if (!baseUrl || !authToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.usage.get(baseUrl, authToken);
      setUsage(result);
      setFetched(true);
    } catch (e: any) {
      setUsage(null);
      setError(e?.toString() ?? t("usage.fetchFailed"));
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, authToken, t]);

  useEffect(() => {
    setUsage(null);
    setError(null);
    setFetched(false);
    if (baseUrl && authToken) fetchUsage();
  }, [profile.id, baseUrl, authToken, fetchUsage]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!baseUrl || !authToken) return;
    timerRef.current = setInterval(fetchUsage, REFRESH_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [baseUrl, authToken, fetchUsage]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  if (error) {
    return (
      <div className="profile-usage-footer">
        <div className="profile-usage-error">
          <span className="profile-usage-error-msg" title={error}>{error}</span>
          <button
            className="mini-btn"
            onClick={(e) => { e.stopPropagation(); fetchUsage(); }}
            title={t("usage.retry")}
            disabled={loading}
          >
            <IconRefresh size={12} className={loading ? "spin" : undefined} />
          </button>
        </div>
      </div>
    );
  }

  if (fetched && (!usage || usage.quotas.length === 0)) {
    return (
      <div className="profile-usage-footer">
        <div className="profile-usage-error">
          <span className="profile-usage-error-msg">{t("usage.noData")}</span>
          <button
            className="mini-btn"
            onClick={(e) => { e.stopPropagation(); fetchUsage(); }}
            title={t("usage.retry")}
            disabled={loading}
          >
            <IconRefresh size={12} className={loading ? "spin" : undefined} />
          </button>
        </div>
      </div>
    );
  }

  if (!usage || usage.quotas.length === 0) return null;

  return (
    <div className="profile-usage-footer">
      <div className="profile-usage">
        <div className="profile-usage-grid">
          {usage.quotas.map((q) => {
            const remainingPct = getRemainingPct(q.percentage);
            const barClass = getBarClass(remainingPct);
            return (
              <div
                key={q.label}
                className="profile-usage-quota"
                onMouseEnter={(e) => {
                  if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                  setHovered({ label: q.label, top: e.clientY + 14, left: e.clientX + 12 });
                }}
                onMouseMove={(e) => {
                  setHovered((prev) => prev ? { ...prev, top: e.clientY + 14, left: e.clientX + 12 } : prev);
                }}
                onMouseLeave={() => {
                  if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                  hoverTimerRef.current = setTimeout(() => setHovered(null), 80);
                }}
              >
                {q.label === "Balance" ? (
                  <div className="profile-usage-balance">
                    <span className="profile-usage-label">{t("usage.balance")}</span>
                    <span className="profile-usage-balance-amt">{q.remaining ?? "-"}</span>
                  </div>
                ) : (
                  <>
                    <div className="profile-usage-head">
                      <span className="profile-usage-label">
                        {q.label === "MCP" ? t("usage.mcp") : q.label}
                      </span>
                      <span className={`profile-usage-pct ${barClass}`}>
                        {t("usage.remainingShort", { pct: remainingPct.toFixed(0) })}
                      </span>
                    </div>
                    <div className="profile-usage-bar">
                      <div
                        className={`profile-usage-bar-fill ${barClass}`}
                        style={{ width: `${remainingPct}%` }}
                      />
                    </div>
                    {q.next_reset_time ? (
                      <span className="profile-usage-reset" title={`${t("usage.resetAt")}${formatExactTime(q.next_reset_time)}`}>
                        <IconClock size={10} />
                        <span>{formatCountdown(q.next_reset_time, now, t)}</span>
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <button
          className={`profile-usage-refresh${loading ? " is-loading" : ""}`}
          onClick={(e) => { e.stopPropagation(); fetchUsage(); }}
          disabled={loading}
          title={t("usage.refresh")}
          aria-label={t("usage.refresh")}
        >
          <IconRefresh size={12} />
        </button>
      </div>

      {hovered && (() => {
        const q = usage.quotas.find((item) => item.label === hovered.label);
        if (!q || !q.remaining || q.label === "Balance") return null;
        const text = `${t("usage.remaining")}: ${q.remaining}`;
        return createPortal(
          <div className="profile-usage-tooltip" style={{ top: hovered.top, left: hovered.left }}>
            {text}
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
