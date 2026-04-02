import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Profile, Host, TabId } from "./types";
import { api } from "./api";
import i18n from "./i18n";
import { ProfileSidebar } from "./components/ProfileSidebar";
import { SettingsEditor } from "./components/SettingsEditor";
import { HostManager } from "./components/HostManager";
import { SyncPanel } from "./components/SyncPanel";

function App() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("editor");
  const [loading, setLoading] = useState(true);
  const [showAbout, setShowAbout] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([api.profile.list(), api.host.list()]);
      setProfiles(p);
      setHosts(h);
      if (!selectedProfileId && p.length > 0) {
        setSelectedProfileId(p.find((pr) => pr.is_active)?.id ?? p[0].id);
      }
      invoke("refresh_tray_menu").catch(() => {});
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sync tray menu labels with current language
  const syncTrayLabels = useCallback(() => {
    invoke("update_tray_labels", {
      openWindow: i18n.t("tray.openWindow"),
      about: i18n.t("tray.about"),
      quit: i18n.t("tray.quit"),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    syncTrayLabels();
  }, [syncTrayLabels]);

  // Listen for show-about event from tray/macOS menu
  useEffect(() => {
    const unlistenAbout = listen("show-about", () => setShowAbout(true));
    const unlistenSwitched = listen("profile-switched", () => refresh());
    return () => {
      unlistenAbout.then((fn) => fn());
      unlistenSwitched.then((fn) => fn());
    };
  }, [refresh]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;

  if (loading) {
    return <div className="empty-state"><p>{t("common.loading")}</p></div>;
  }

  return (
    <>
      <ProfileSidebar
        profiles={profiles}
        selectedId={selectedProfileId}
        onSelect={setSelectedProfileId}
        onRefresh={refresh}
        onSwitchActive={setSelectedProfileId}
      />
      <div className="main-content">
        <div className="main-header">
          <h1>LLM Switch</h1>
        </div>
        <div className="tabs">
          <button className={`tab ${activeTab === "editor" ? "active" : ""}`} onClick={() => setActiveTab("editor")}>
            {t("tabs.editor")}
          </button>
          <button className={`tab ${activeTab === "sync" ? "active" : ""}`} onClick={() => setActiveTab("sync")}>
            {t("tabs.sync")}
          </button>
          <button className={`tab ${activeTab === "hosts" ? "active" : ""}`} onClick={() => setActiveTab("hosts")}>
            {t("tabs.hosts")}
          </button>
        </div>
        <div className="main-body">
          {activeTab === "editor" && (
            selectedProfile ? (
              <SettingsEditor profile={selectedProfile} onSaved={refresh} />
            ) : (
              <div className="empty-state">
                <p>{t("sidebar.noProfiles")}</p>
              </div>
            )
          )}
          {activeTab === "sync" && (
            <SyncPanel profiles={profiles} hosts={hosts} />
          )}
          {activeTab === "hosts" && (
            <HostManager hosts={hosts} onRefresh={refresh} />
          )}
        </div>
      </div>

      {/* About dialog */}
      {showAbout && (
        <div className="dialog-overlay" onClick={() => setShowAbout(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", minWidth: 340 }}>
            <h3 style={{ marginBottom: 8, fontSize: 20 }}>LLM Switch</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>v1.0.0</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              {t("about.description")}
            </p>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); invoke("open_github"); }}
              style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}
            >
              https://github.com/dmz2922990/LLM-Switch
            </a>
            <div className="dialog-actions" style={{ justifyContent: "center" }}>
              <button className="btn-primary btn-sm" onClick={() => setShowAbout(false)}>{t("common.confirm")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
