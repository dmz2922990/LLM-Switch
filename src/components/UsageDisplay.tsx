import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Profile, UsageInfo } from "../types";
import { api } from "../api";

const REFRESH_INTERVAL = 5 * 60 * 1000;

function parseEnv(json: string): Record<string, string> {
  try {
    const parsed = JSON.parse(json);
    return parsed?.env ?? {};
  } catch {
    return {};
  }
}

function getBarColor(pct: number): string {
  if (pct >= 90) return "var(--danger)";
  if (pct >= 70) return "var(--warning)";
  return "var(--success)";
}

function formatResetTime(ms: number): string {
  if (!ms) return "-";
  return new Date(ms).toLocaleString(undefined, {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function UsageDisplay({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const env = parseEnv(profile.settings_json);
  const baseUrl = env.ANTHROPIC_BASE_URL ?? "";
  const authToken = env.ANTHROPIC_AUTH_TOKEN ?? "";

  const fetchUsage = useCallback(async () => {
    if (!baseUrl || !authToken) return;
    setLoading(true);
    try {
      const result = await api.usage.get(baseUrl, authToken);
      setUsage(result);
    } catch {
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, authToken]);

  useEffect(() => {
    setUsage(null);
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

  if (!usage || usage.quotas.length === 0) return null;

  return (
    <div className="profile-usage">
      {usage.quotas.map((q) => (
        <div
          key={q.label}
          className="profile-usage-quota"
          onMouseEnter={() => setHovered(q.label)}
          onMouseLeave={() => setHovered(null)}
          style={{ position: "relative" }}
        >
          <span className="profile-usage-label">{q.label}</span>
          <div className="profile-usage-bar">
            <div
              className="profile-usage-bar-fill"
              style={{
                width: `${Math.min(q.percentage, 100)}%`,
                background: getBarColor(q.percentage),
              }}
            />
          </div>
          <span className="profile-usage-pct">{q.percentage.toFixed(0)}%</span>
          {hovered === q.label && (
            <div className="profile-usage-tooltip">
              {q.remaining
                ? `${t("usage.remaining")}: ${q.remaining}`
                : `${t("usage.resetAt")}: ${formatResetTime(q.next_reset_time)}`}
            </div>
          )}
        </div>
      ))}
      <button
        className="profile-usage-refresh"
        onClick={(e) => { e.stopPropagation(); fetchUsage(); }}
        disabled={loading}
      >
        {loading ? "..." : "↻"}
      </button>
    </div>
  );
}
