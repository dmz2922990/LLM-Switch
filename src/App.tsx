import logoUrl from "./img/transparent-logo.png";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Profile, Host, TabId } from "./types";
import { api } from "./api";
import i18n from "./i18n";
import { ProfileSidebar } from "./components/ProfileSidebar";
import { SettingsEditor } from "./components/SettingsEditor";
import { HostManager } from "./components/HostManager";
import { SyncPanel } from "./components/SyncPanel";

type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "upToDate" }
  | { state: "available"; version: string }
  | { state: "downloading"; percent: number }
  | { state: "downloadComplete" }
  | { state: "failed"; message: string };

function App() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("editor");
  const [loading, setLoading] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: "idle" });

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

  useEffect(() => {
    const unlistenAbout = listen("show-about", () => setShowAbout(true));
    const unlistenSwitched = listen("profile-switched", () => refresh());
    return () => {
      unlistenAbout.then((fn) => fn());
      unlistenSwitched.then((fn) => fn());
    };
  }, [refresh]);

  const handleCheckUpdate = useCallback(async () => {
    setUpdateStatus({ state: "checking" });
    try {
      const update = await check();
      if (update) {
        setUpdateStatus({ state: "available", version: update.version });
      } else {
        setUpdateStatus({ state: "upToDate" });
      }
    } catch {
      setUpdateStatus({ state: "failed", message: t("updater.checkFailed") });
    }
  }, [t]);

  const handleDownloadAndInstall = useCallback(async () => {
    try {
      const update = await check();
      if (!update) return;

      let downloaded = 0;
      let contentLength = 0;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setUpdateStatus({ state: "downloading", percent: Math.round((downloaded / contentLength) * 100) });
            }
            break;
          case "Finished":
            setUpdateStatus({ state: "downloadComplete" });
            break;
        }
      });
      await relaunch();
    } catch {
      setUpdateStatus({ state: "failed", message: t("updater.updateFailed") });
      invoke("open_github").catch(() => {});
    }
  }, [t]);

  const handleGoToDownload = useCallback(() => {
    invoke("open_github").catch(() => {});
  }, []);

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
          <img src={logoUrl} alt="" style={{ width: 44, height: 44 }} />
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
            <SyncPanel profiles={profiles} hosts={hosts} onRefresh={refresh} />
          )}
          {activeTab === "hosts" && (
            <HostManager hosts={hosts} onRefresh={refresh} />
          )}
        </div>
      </div>

      {/* About dialog */}
      {showAbout && (
        <div className="dialog-overlay" onClick={() => { setShowAbout(false); setUpdateStatus({ state: "idle" }); }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", minWidth: 340 }}>
            <h3 style={{ marginBottom: 8, fontSize: 20 }}>LLM Switch</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>v1.0.4</p>
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

            {/* Update section */}
            <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              {updateStatus.state === "idle" && (
                <button className="btn-secondary btn-sm" onClick={handleCheckUpdate}>
                  {t("updater.checkUpdate")}
                </button>
              )}
              {updateStatus.state === "checking" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t("updater.checking")}</p>
              )}
              {updateStatus.state === "upToDate" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t("updater.upToDate")}</p>
              )}
              {updateStatus.state === "available" && (
                <div>
                  <p style={{ fontSize: 13, marginBottom: 8 }}>{t("updater.newVersion", { version: updateStatus.version })}</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button className="btn-primary btn-sm" onClick={handleDownloadAndInstall}>
                      {t("updater.downloadAndRestart")}
                    </button>
                    <button className="btn-secondary btn-sm" onClick={handleGoToDownload}>
                      {t("updater.goToDownload")}
                    </button>
                  </div>
                </div>
              )}
              {updateStatus.state === "downloading" && (
                <div>
                  <div style={{ background: "var(--border)", borderRadius: 4, height: 6, marginBottom: 6, overflow: "hidden" }}>
                    <div style={{ background: "var(--accent)", height: "100%", width: `${updateStatus.percent}%`, transition: "width 0.2s" }} />
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t("updater.downloading", { percent: updateStatus.percent })}</p>
                </div>
              )}
              {updateStatus.state === "downloadComplete" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t("updater.downloadComplete")}</p>
              )}
              {updateStatus.state === "failed" && (
                <p style={{ color: "var(--danger)", fontSize: 13 }}>{updateStatus.message}</p>
              )}
            </div>

            <div className="dialog-actions" style={{ justifyContent: "center" }}>
              <button className="btn-primary btn-sm" onClick={() => { setShowAbout(false); setUpdateStatus({ state: "idle" }); }}>{t("common.confirm")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
