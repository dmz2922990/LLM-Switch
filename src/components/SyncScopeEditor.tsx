import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Profile } from "../types";
import { api } from "../api";
import { parseTopLevelKeys, parseSyncKeys } from "../lib/syncKeys";

// Union of all top-level keys across every profile's settings_json.
function unionKeys(profiles: Profile[]): string[] {
  const set = new Set<string>();
  for (const p of profiles) {
    for (const k of parseTopLevelKeys(p.settings_json)) set.add(k);
  }
  return Array.from(set);
}

// Union of every profile's already-selected sync_keys.
function unionSyncKeys(profiles: Profile[]): Set<string> {
  const set = new Set<string>();
  for (const p of profiles) {
    for (const k of parseSyncKeys(p.sync_keys)) set.add(k);
  }
  return set;
}

export function SyncScopeEditor({ profiles }: { profiles: Profile[] }) {
  const { t } = useTranslation();
  const topLevelKeys = unionKeys(profiles);
  const [syncKeys, setSyncKeys] = useState<Set<string>>(() => unionSyncKeys(profiles));

  useEffect(() => {
    setSyncKeys(unionSyncKeys(profiles));
  }, [profiles]);

  // Persist the same selection to every profile's sync_keys so any of them
  // synced later uses the union scope. Missing keys are ignored by the backend.
  const handleChange = async (next: Set<string>) => {
    setSyncKeys(next);
    const json = JSON.stringify(Array.from(next));
    await Promise.all(
      profiles.map((p) => api.profile.updateSyncKeys(p.id, json).catch(() => {})),
    );
  };

  if (topLevelKeys.length === 0) return null;

  return (
    <div className="sync-scope-panel">
      <div className="sync-scope-head">
        <span className="field-label">{t("sync.syncScope")}</span>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() =>
            handleChange(syncKeys.size === topLevelKeys.length ? new Set() : new Set(topLevelKeys))
          }
        >
          {t("sync.selectAll")}
        </button>
      </div>
      <div className="sync-scope-chips">
        {topLevelKeys.map((key) => (
          <label key={key} className="chip">
            <input
              type="checkbox"
              checked={syncKeys.has(key)}
              onChange={() => {
                const next = new Set(syncKeys);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                handleChange(next);
              }}
              style={{ width: "auto" }}
            />
            {key}
          </label>
        ))}
      </div>
      <p className="scope-hint">{t("sync.scopeHint")}</p>
    </div>
  );
}
