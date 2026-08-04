import { useTranslation } from "react-i18next";
import type { Profile, SyncHistory } from "../types";
import { ProfileCard } from "./ProfileCard";

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
  onOpenSyncHistory: () => void;
  syncingId: string | null;
  syncSummaries: Record<string, SyncHistory>;
  latestSyncId: string | null;
  flashProfileId: string | null;
  hostNames: Record<string, string>;
}

export function ProfileGrid({
  profiles, selectedId, onSelect, onSwitchActive, onOpenSettings,
  onSync, onCopy, onDelete, onReorder, onRenamed, onOpenSyncHistory, syncingId,
  syncSummaries, latestSyncId, flashProfileId, hostNames,
}: Props) {
  const { t } = useTranslation();

  const handleMove = (index: number, direction: -1 | 1) => {
    const to = index + direction;
    if (to < 0 || to >= profiles.length) return;
    const reordered = [...profiles];
    [reordered[index], reordered[to]] = [reordered[to], reordered[index]];
    onReorder(reordered.map((p) => p.id));
  };

  return (
    <div className="profile-grid">
      {profiles.length === 0 && (
        <div className="empty-state" style={{ gridColumn: "1 / -1", padding: 32 }}>
          <p>{t("sidebar.noProfiles")}</p>
        </div>
      )}
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
          syncing={syncingId === p.id}
          latestSync={latestSyncId === p.id ? (syncSummaries[p.id] ?? null) : null}
          flash={flashProfileId === p.id}
          hostNames={hostNames}
        />
      ))}
    </div>
  );
}
