import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { Profile, ReminderConfig, SyncHistory } from "../types";
import { getPeakInfo } from "../lib/reminder";
import type { PeakInfo } from "../lib/reminder";
import { api } from "../api";
import { UsageDisplay } from "./UsageDisplay";
import { formatRelativeTime } from "../lib/format";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconCopy,
  IconCpu,
  IconFlame,
  IconLink,
  IconMoreHorizontal,
  IconPencil,
  IconRefresh,
  IconSettings,
  IconSync,
  IconTrash,
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
  onRenamed: () => void;
  onOpenSyncHistory: () => void;
  onError: (msg: string) => void;
  syncing: boolean;
  latestSync: SyncHistory | null;
  flash: boolean;
  hostNames: Record<string, string>;
  reminderConfigs: ReminderConfig[];
}

function parseProfileMeta(json: string): { host: string | null; model: string | null } {
  try {
    const parsed = JSON.parse(json);
    const env = parsed?.env ?? {};
    let host: string | null = null;
    const rawUrl = (env.ANTHROPIC_BASE_URL ?? "").trim();
    if (rawUrl) {
      try {
        host = new URL(rawUrl).hostname;
      } catch {
        host = rawUrl.replace(/^https?:\/\//, "").split("/")[0] || null;
      }
    }
    const model =
      (env.ANTHROPIC_MODEL ||
        env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
        env.ANTHROPIC_DEFAULT_OPUS_MODEL ||
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL ||
        "").trim() || null;
    return { host, model };
  } catch {
    return { host: null, model: null };
  }
}

export function ProfileCard({
  profile, selected, index, count, onSelect, onSwitchActive,
  onOpenSettings, onSync, onCopy, onDelete, onMove, onRenamed,
  onOpenSyncHistory, onError, syncing,
  latestSync, flash, hostNames, reminderConfigs,
}: Props) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(profile.name);
  const [now, setNow] = useState(() => new Date());
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  // Refresh current time every 60s to update peak badge
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Close overflow menu on outside click, escape, or scroll
  useEffect(() => {
    if (!menuPos) return;
    const close = () => setMenuPos(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuPos]);

  const peak: PeakInfo = getPeakInfo(profile, reminderConfigs, now);
  const meta = useMemo(() => parseProfileMeta(profile.settings_json), [profile.settings_json]);

  const commitRename = async () => {
    setRenaming(false);
    if (!renameVal.trim() || renameVal.trim() === profile.name) return;
    try {
      await api.profile.rename(profile.id, renameVal.trim());
      onRenamed();
    } catch (err: any) {
      onError(err.toString());
    }
  };

  const openMoreMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuPos) {
      setMenuPos(null);
      return;
    }
    const rect = moreBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 156;
    const menuHeight = 204;
    const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12);
    const top =
      rect.bottom + menuHeight + 12 > window.innerHeight
        ? Math.max(12, rect.top - menuHeight - 6)
        : rect.bottom + 6;
    setMenuPos({ top, left: Math.max(12, left) });
  };

  const cardClass = [
    "profile-card",
    profile.is_active ? "is-active" : "",
    selected ? "is-selected" : "",
    renaming ? "is-renaming" : "",
    menuPos ? "has-menu-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass} onClick={() => onSelect(profile.id)}>
      <div className="profile-card-top">
        <div className="profile-card-identity">
          <span
            className={`status-dot${profile.is_active ? " status-dot--active" : ""}`}
            aria-hidden="true"
          />
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
              className="profile-rename-input"
            />
          ) : (
            <span
              className="profile-card-name"
              title={profile.name}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setRenaming(true);
                setRenameVal(profile.name);
              }}
            >
              {profile.name}
            </span>
          )}
          {!renaming && (
            <div className="profile-card-badges">
              {profile.is_active && (
                <span className="badge badge--link">{t("sidebar.active")}</span>
              )}
              {peak.inPeak && (
                <span
                  className="badge badge--peak"
                  title={peak.label ? `${t("reminder.peakPeriod")}: ${peak.label}` : t("reminder.peakPeriod")}
                >
                  <IconFlame size={11} />
                </span>
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
            </div>
          )}
        </div>

        <div className="profile-card-actions">
          {!profile.is_active && (
            <button
              className="card-switch-btn"
              onClick={(e) => { e.stopPropagation(); onSwitchActive(profile.id); }}
              title={t("sidebar.switch")}
            >
              <IconCheck size={12} />
              <span>{t("sidebar.switch")}</span>
            </button>
          )}
          <button
            className="card-action-btn"
            onClick={(e) => { e.stopPropagation(); onSync(profile); }}
            disabled={syncing}
            title={t("tabs.sync")}
          >
            {syncing ? <IconRefresh size={14} className="spin" /> : <IconSync size={14} />}
          </button>
          <button
            className="card-action-btn"
            onClick={(e) => { e.stopPropagation(); onOpenSettings(profile); }}
            title={t("common.settings")}
          >
            <IconSettings size={14} />
          </button>
          <button
            ref={moreBtnRef}
            className={`card-action-btn${menuPos ? " is-open" : ""}`}
            onClick={openMoreMenu}
            title={t("common.more")}
            aria-label={t("common.more")}
          >
            <IconMoreHorizontal size={14} />
          </button>
        </div>
      </div>

      <div className="profile-card-meta">
        {meta.host ? (
          <span className="meta-chip" title={meta.host}>
            <IconLink size={11} />
            <span className="meta-chip-text">{meta.host}</span>
          </span>
        ) : (
          <span className="meta-chip meta-chip--muted">
            <span className="meta-chip-text">{t("sidebar.unconfigured")}</span>
          </span>
        )}
        {meta.model && (
          <span className="meta-chip" title={meta.model}>
            <IconCpu size={11} />
            <span className="meta-chip-text">{meta.model}</span>
          </span>
        )}
        {profile.activation_time && (
          <span className="meta-chip meta-chip--accent" title={t("activation.configTitle")}>
            <IconClock size={11} />
            <span className="meta-chip-text">{profile.activation_time}</span>
          </span>
        )}
      </div>

      <UsageDisplay profile={profile} />

      {menuPos && createPortal(
        <div
          className="ctx-menu card-dropdown-menu"
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="ctx-menu-item"
            onClick={() => {
              setMenuPos(null);
              setRenaming(true);
              setRenameVal(profile.name);
            }}
          >
            <span className="ctx-menu-item-label">
              <IconPencil size={13} />
              <span>{t("common.rename")}</span>
            </span>
          </button>
          <button
            className="ctx-menu-item"
            onClick={() => {
              setMenuPos(null);
              onCopy(profile.id);
            }}
          >
            <span className="ctx-menu-item-label">
              <IconCopy size={13} />
              <span>{t("common.copy")}</span>
            </span>
          </button>
          <div className="ctx-menu-sep" />
          <button
            className="ctx-menu-item"
            disabled={index === 0}
            onClick={() => {
              setMenuPos(null);
              onMove(index, -1);
            }}
          >
            <span className="ctx-menu-item-label">
              <IconChevronUp size={13} />
              <span>{t("sidebar.moveUp")}</span>
            </span>
          </button>
          <button
            className="ctx-menu-item"
            disabled={index === count - 1}
            onClick={() => {
              setMenuPos(null);
              onMove(index, 1);
            }}
          >
            <span className="ctx-menu-item-label">
              <IconChevronDown size={13} />
              <span>{t("sidebar.moveDown")}</span>
            </span>
          </button>
          <div className="ctx-menu-sep" />
          <button
            className="ctx-menu-item ctx-menu-item--danger"
            onClick={() => {
              setMenuPos(null);
              onDelete(profile.id);
            }}
          >
            <span className="ctx-menu-item-label">
              <IconTrash size={13} />
              <span>{t("common.delete")}</span>
            </span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
