import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Profile } from "../types";
import { api } from "../api";

interface Props {
  profiles: Profile[];
  onChanged: () => void;
}

export function ActivationConfigList({ profiles, onChanged }: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const d: Record<string, string> = {};
    for (const p of profiles) {
      d[p.id] = p.activation_time ?? "";
    }
    setDrafts(d);
  }, [profiles]);

  const handleToggle = async (p: Profile, enabled: boolean) => {
    const time = enabled ? drafts[p.id] || "09:00" : null;
    setSaving(p.id);
    try {
      await api.activation.updateTime(p.id, time);
      onChanged();
    } catch (e: any) {
      alert(e.toString());
    } finally {
      setSaving(null);
    }
  };

  const commitTime = async (p: Profile) => {
    const val = drafts[p.id] ?? "";
    if (val === (p.activation_time ?? "")) return;
    setSaving(p.id);
    try {
      await api.activation.updateTime(p.id, val || null);
      onChanged();
    } catch (e: any) {
      alert(e.toString());
    } finally {
      setSaving(null);
    }
  };

  if (profiles.length === 0) {
    return <p className="empty-text">{t("sidebar.noProfiles")}</p>;
  }

  return (
    <div className="settings-card-list">
      {profiles.map((p) => {
        const enabled = !!p.activation_time;
        return (
          <div key={p.id} className="activation-config-row">
            <span className="activation-config-name">{p.name}</span>
            <div className="activation-config-controls">
              <input
                type="time"
                value={drafts[p.id] ?? ""}
                disabled={!enabled || saving === p.id}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                onBlur={() => commitTime(p)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="activation-time-input"
              />
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                className={`switch${enabled ? " is-on" : ""}`}
                onClick={() => handleToggle(p, !enabled)}
                disabled={saving === p.id}
                title={t("activation.toggleHint")}
                aria-label={t("activation.toggleHint")}
              >
                <span className="switch-thumb" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
