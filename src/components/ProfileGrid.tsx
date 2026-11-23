import { useTranslation } from "react-i18next";
import type { Profile, ReminderConfig, SyncHistory } from "../types";
import { ProfileCard } from "./ProfileCard";
import { IconPlus, IconSliders } from "./icons";

interface Props {
  profiles: Profile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSwitchActive: (id: string) => void;
  onOpenSettings: (profile: Profile) => void;
  onSync: (profile: Profile) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onRenamed: () => void;
  onNewProfile: () => void;
  onOpenSyncHistory: () => void;
  onError: (msg: string) => void;
  syncingId: string | null;
  syncSummaries: Record<string, SyncHistory>;
  latestSyncId: string | null;
  flashProfileId: string | null;
  hostNames: Record<string, string>;
  reminderConfigs: ReminderConfig[];
}

export function ProfileGrid({
  profiles, selectedId, onSelect, onSwitchActive, onOpenSettings,
  onSync, onCopy, onDelete, onReorder, onRenamed, onNewProfile,
  onOpenSyncHistory, onError, syncingId,
  syncSummaries, latestSyncId, flashProfileId, hostNames, reminderConfigs,
}: Props) {
  const { t } = useTranslation();

  const handleMove = (index: number, direction: -1 | 1) => {
    const to = index + direction;
    if (to < 0 || to >= profiles.length) return;
    const reordered = [...profiles];
    [reordered[index], reordered[to]] = [reordered[to], reordered[index]];
    onReorder(reordered.map((p) => p.id));
  };

  if (profiles.length === 0) {
    return (
      <div className="empty-card">
        <div className="empty-card-icon">
          <IconSliders size={22} />
        </div>
        <p className="empty-card-title">{t("sidebar.noProfiles")}</p>
        <button className="btn btn--primary" onClick={onNewProfile}>
          <IconPlus size={15} />
          <span>{t("sidebar.createFirst")}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="profile-grid">
      {profiles.map((p, idx) => (
        <ProfileCard
          key={p.id}
          profile={p}
          selected={selectedId === p.id}
          index={idx}
          count={profiles.length}
          onSelect={onSelect}
          onSwitchActive={onSwitchActive}
          onOpenSettings={onOpenSettings}
          onSync={onSync}
          onCopy={onCopy}
          onDelete={onDelete}
          onMove={handleMove}
          onRenamed={onRenamed}
          onOpenSyncHistory={onOpenSyncHistory}
          onError={onError}
          syncing={syncingId === p.id}
          latestSync={latestSyncId === p.id ? (syncSummaries[p.id] ?? null) : null}
          flash={flashProfileId === p.id}
          hostNames={hostNames}
          reminderConfigs={reminderConfigs}
        />
      ))}
    </div>
  );
}
