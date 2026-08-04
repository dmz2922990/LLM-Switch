import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Host, Profile } from "../types";
import { Dialog } from "./Dialog";
import { HostManager } from "./HostManager";
import { SyncHistoryList } from "./SyncHistoryList";
import { SyncScopeEditor } from "./SyncScopeEditor";
import { AboutPanel, type UpdateStatus } from "./AboutPanel";

type TabId = "hosts" | "sync" | "about";

interface Props {
  tab: TabId;
  hosts: Host[];
  profiles: Profile[];
  onRefreshHosts: () => void;
  onClose: () => void;
  updateStatus: UpdateStatus;
  appVersion: string;
  onCheckUpdate: () => void;
  onDownloadInstall: () => void;
  onGoToDownload: () => void;
}

export function GlobalSettingsDialog({
  tab, hosts, profiles, onRefreshHosts, onClose, updateStatus, appVersion,
  onCheckUpdate, onDownloadInstall, onGoToDownload,
}: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>(tab);

  return (
    <Dialog
      title={t("globalSettings.title")}
      size="settings"
      onClose={onClose}
    >
      <div className="gst-tabs">
        <button className={`gst-tab${activeTab === "hosts" ? " active" : ""}`} onClick={() => setActiveTab("hosts")}>
          {t("globalSettings.tabs.hosts")}
        </button>
        <button className={`gst-tab${activeTab === "sync" ? " active" : ""}`} onClick={() => setActiveTab("sync")}>
          {t("globalSettings.tabs.sync")}
        </button>
        <button className={`gst-tab${activeTab === "about" ? " active" : ""}`} onClick={() => setActiveTab("about")}>
          {t("globalSettings.tabs.about")}
        </button>
      </div>
      <div className="gst-body">
        {activeTab === "hosts" && (
          <HostManager hosts={hosts} onRefresh={onRefreshHosts} embedded />
        )}
        {activeTab === "sync" && (
          <div className="sync-tab">
            {profiles.length === 0 ? (
              <p className="empty-text" style={{ padding: "16px 20px" }}>
                {t("sidebar.noProfiles")}
              </p>
            ) : (
              <>
                <SyncScopeEditor profiles={profiles} />
                <div className="sync-tab-divider" />
                <SyncHistoryList profiles={profiles} hosts={hosts} />
              </>
            )}
          </div>
        )}
        {activeTab === "about" && (
          <AboutPanel
            updateStatus={updateStatus}
            appVersion={appVersion}
            onCheckUpdate={onCheckUpdate}
            onDownloadInstall={onDownloadInstall}
            onGoToDownload={onGoToDownload}
          />
        )}
      </div>
    </Dialog>
  );
}
