import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Profile, SyncHistory } from "../types";
import { api } from "../api";
import { UsageDisplay } from "./UsageDisplay";
import { formatRelativeTime } from "../lib/format";
import {
  IconCheck, IconChevronDown, IconChevronUp, IconCopy, IconPencil, IconRefresh, IconSettings, IconSync, IconX,
} from "./icons";

interface Props {
  profile: Profile;
  selected: boolean;
  index: number;
  count: number;
  onSelect: (id: string) => void;
  onSwitchActive: (id: string) => void;
  onOpenSettings: (profile: Profile) => void;
  onSync: (profile: Profile) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onOpenSyncHistory: () => void;
  syncing: boolean;
  latestSync: SyncHistory | null;
  flash: boolean;
  hostNames: Record<string, string>;
}

export function ProfileCard({
  profile, selected, index, count, onSelect, onSwitchActive,
  onOpenSettings, onSync, onCopy, onDelete, onMove, onOpenSyncHistory, syncing,
  latestSync, flash, hostNames,
}: Props) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(profile.name);

  const commitRename = async () => {
    setRenaming(false);
    if (!renameVal.trim() || renameVal.trim() === profile.name) return;
    try {
      await api.profile.rename(profile.id, renameVal.trim());
    } catch (err: any) {
      alert(err.toString());
    }
  };

  return (
    <div
      className={`profile-card${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(profile.id)}
    >
      <div className="profile-card-top">
        {renaming ? (
          <input
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setRenaming(false); setRenameVal(profile.name); }
            }}
            onBlur={commitRename}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, padding: "2px 6px", fontSize: "var(--fs-sm)" }}
          />
        ) : (
          <span className="profile-card-name" onDoubleClick={() => { setRenaming(true); setRenameVal(profile.name); }}>
            {profile.name}
          </span>
        )}
        <div className="profile-card-actions">
          {profile.is_active ? (
            <span className="badge badge--link">{t("sidebar.active")}</span>
          ) : (
            <button
              className="icon-btn"
              onClick={(e) => { e.stopPropagation(); onSwitchActive(profile.id); }}
              title={t("sidebar.switch")}
            >
              <IconCheck size={13} />
            </button>
          )}
          {latestSync && (
            <span
              className={`badge sync-badge badge--info${flash ? " is-flash" : ""}`}
              title={`${formatRelativeTime(latestSync.synced_at)} → ${hostNames[latestSync.host_id] ?? latestSync.host_id}${latestSync.error_message ? ` · ${latestSync.error_message}` : ""}`}
              onClick={(e) => { e.stopPropagation(); onOpenSyncHistory(); }}
            >
              {t("sync.remoteBadge")}
            </span>
          )}
          <button
            className="icon-btn"
            onClick={(e) => { e.stopPropagation(); onSync(profile); }}
            disabled={syncing}
            title={t("tabs.sync")}
          >
            {syncing ? <IconRefresh size={13} className="spin" /> : <IconSync size={13} />}
          </button>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onOpenSettings(profile); }} title={t("common.settings")}>
            <IconSettings size={13} />
          </button>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onCopy(profile.id); }} title={t("common.copy")}>
            <IconCopy size={13} />
          </button>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setRenaming(true); setRenameVal(profile.name); }} title={t("common.rename")}>
            <IconPencil size={13} />
          </button>
          <button className="icon-btn icon-btn--danger" onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }} title={t("common.delete")}>
            <IconX size={13} />
          </button>
        </div>
        <div className="profile-card-sort">
          <button className="mini-btn" disabled={index === 0} onClick={(e) => { e.stopPropagation(); onMove(index, -1); }} title={t("sidebar.sort")}>
            <IconChevronUp size={12} />
          </button>
          <button className="mini-btn" disabled={index === count - 1} onClick={(e) => { e.stopPropagation(); onMove(index, 1); }} title={t("sidebar.sort")}>
            <IconChevronDown size={12} />
          </button>
        </div>
      </div>

      <UsageDisplay profile={profile} />
    </div>
  );
}
