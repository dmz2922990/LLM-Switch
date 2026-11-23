import { useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Host, Profile, ReminderConfig } from "../types";
import { Dialog } from "./Dialog";
import { HostManager } from "./HostManager";
import { SyncHistoryList } from "./SyncHistoryList";
import { SyncScopeEditor } from "./SyncScopeEditor";
import { AboutPanel, type UpdateStatus } from "./AboutPanel";
import { ActivationConfigList } from "./ActivationConfigList";
import { ActivationHistoryList } from "./ActivationHistoryList";
import { ReminderConfigList } from "./ReminderConfigList";
import { IconBell, IconClock, IconInfo, IconServer, IconSync, IconX } from "./icons";
import { api } from "../api";

type TabId = "hosts" | "sync" | "activation" | "reminder" | "about";

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
  const [reminderConfigs, setReminderConfigs] = useState<ReminderConfig[]>([]);

  useEffect(() => {
    api.reminder.listConfigs().then(setReminderConfigs).catch(() => {});
  }, []);

  const refreshReminders = () => {
    api.reminder.listConfigs().then(setReminderConfigs).catch(() => {});
    onRefreshHosts();
  };

  const navItems: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: "hosts", label: t("globalSettings.tabs.hosts"), icon: <IconServer size={15} /> },
    { id: "sync", label: t("globalSettings.tabs.sync"), icon: <IconSync size={15} /> },
    { id: "activation", label: t("globalSettings.tabs.activation"), icon: <IconClock size={15} /> },
    { id: "reminder", label: t("globalSettings.tabs.reminder"), icon: <IconBell size={15} /> },
    { id: "about", label: t("globalSettings.tabs.about"), icon: <IconInfo size={15} /> },
  ];

  const currentNav = navItems.find((item) => item.id === activeTab);

  return (
    <Dialog size="settings" onClose={onClose} hideHeader>
      <div className="gst-layout">
        <aside className="gst-sidebar">
          <div className="gst-sidebar-title">{t("globalSettings.title")}</div>
          <nav className="gst-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`gst-nav-item${activeTab === item.id ? " active" : ""}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="gst-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="gst-main">
          <div className="gst-main-header">
            <h3 className="gst-main-title">{currentNav?.label}</h3>
            <button
              className="dialog-close"
              onClick={onClose}
              title={t("common.close")}
              aria-label={t("common.close")}
            >
              <IconX size={15} />
            </button>
          </div>

          <div className="gst-body">
            {activeTab === "hosts" && (
              <HostManager hosts={hosts} onRefresh={onRefreshHosts} embedded />
            )}
            {activeTab === "sync" && (
              <div className="gst-scroll">
                {profiles.length === 0 ? (
                  <p className="empty-text" style={{ padding: "20px 24px" }}>
                    {t("sidebar.noProfiles")}
                  </p>
                ) : (
                  <div className="gst-stack">
                    <SyncScopeEditor profiles={profiles} />
                    <div className="gst-section">
                      <div className="gst-section-title">{t("sync.syncHistory")}</div>
                      <SyncHistoryList profiles={profiles} hosts={hosts} />
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "activation" && (
              <div className="gst-scroll">
                <div className="gst-stack">
                  <div className="gst-section">
                    <div className="gst-section-title">{t("activation.configTitle")}</div>
                    <p className="scope-hint">{t("activation.timeHint")}</p>
                    <ActivationConfigList profiles={profiles} onChanged={onRefreshHosts} />
                  </div>
                  <div className="gst-section">
                    <div className="gst-section-title">{t("activation.logTitle")}</div>
                    <ActivationHistoryList profiles={profiles} />
                  </div>
                </div>
              </div>
            )}
            {activeTab === "reminder" && (
              <div className="gst-scroll">
                <div className="gst-stack">
                  <div className="gst-section">
                    <div className="gst-section-title">{t("reminder.configTitle")}</div>
                    <p className="scope-hint">{t("reminder.timeHint")}</p>
                    <ReminderConfigList configs={reminderConfigs} onChanged={refreshReminders} />
                  </div>
                </div>
              </div>
            )}
            {activeTab === "about" && (
              <div className="gst-scroll">
                <AboutPanel
                  updateStatus={updateStatus}
                  appVersion={appVersion}
                  onCheckUpdate={onCheckUpdate}
                  onDownloadInstall={onDownloadInstall}
                  onGoToDownload={onGoToDownload}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </Dialog>
  );
}
