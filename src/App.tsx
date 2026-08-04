import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Profile, Host, SyncHistory } from "./types";
import { api } from "./api";
import i18n from "./i18n";
import { TopBar } from "./components/TopBar";
import { ProfileGrid } from "./components/ProfileGrid";
import { ProfileSettingsDialog } from "./components/ProfileSettingsDialog";
import { SyncHostDialog } from "./components/SyncHostDialog";
import { GlobalSettingsDialog } from "./components/GlobalSettingsDialog";
import { NewProfileDialog } from "./components/NewProfileDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { IconPlus } from "./components/icons";
import type { UpdateStatus } from "./components/AboutPanel";

type GlobalTab = "hosts" | "sync" | "about";

function App() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalDialog, setGlobalDialog] = useState<{ open: boolean; tab: GlobalTab }>({ open: false, tab: "hosts" });
  const [settingsProfileId, setSettingsProfileId] = useState<string | null>(null);
  const [syncProfileId, setSyncProfileId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [syncingProfileId, setSyncingProfileId] = useState<string | null>(null);
  const [syncToast, setSyncToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: "idle" });
  const [appVersion, setAppVersion] = useState("");
  const [startupUpdate, setStartupUpdate] = useState<Update | null>(null);
  const [showStartupUpdateDialog, setShowStartupUpdateDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [syncSummaries, setSyncSummaries] = useState<Record<string, SyncHistory>>({});
  const [flashProfileId, setFlashProfileId] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hostNames = useMemo(
    () => Object.fromEntries(hosts.map((h) => [h.id, h.name])),
    [hosts],
  );

  // Profile whose last sync is the most recent across all profiles.
  const latestSyncId = useMemo(() => {
    let latest: string | null = null;
    let latestTime = -Infinity;
    for (const [pid, rec] of Object.entries(syncSummaries)) {
      const t = new Date(rec.synced_at).getTime();
      if (t > latestTime) { latestTime = t; latest = pid; }
    }
    return latest;
  }, [syncSummaries]);

  const refresh = useCallback(async () => {
    try {
      const [p, h, hist] = await Promise.all([api.profile.list(), api.host.list(), api.sync.history()]);
      setProfiles(p);
      setHosts(h);
      // history is newest-first; first record per profile is its latest sync
      const map: Record<string, SyncHistory> = {};
      for (const rec of hist) if (!map[rec.profile_id]) map[rec.profile_id] = rec;
      setSyncSummaries(map);
      if (selectedProfileId && !p.some((pr) => pr.id === selectedProfileId)) {
        setSelectedProfileId(p.find((pr) => pr.is_active)?.id ?? p[0]?.id ?? null);
      } else if (!selectedProfileId && p.length > 0) {
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
    getVersion().then(setAppVersion);
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const showToast = useCallback((kind: "ok" | "err", msg: string) => {
    setSyncToast({ kind, msg });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSyncToast(null), 3000);
  }, []);

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
    const unlistenAbout = listen("show-about", () => setGlobalDialog({ open: true, tab: "about" }));
    const unlistenSwitched = listen("profile-switched", () => refresh());
    const unlistenFileChanged = listen("settings-file-changed", () => refresh());
    return () => {
      unlistenAbout.then((fn) => fn());
      unlistenSwitched.then((fn) => fn());
      unlistenFileChanged.then((fn) => fn());
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
    setUpdateStatus({ state: "downloading", percent: 0 });
    try {
      const update = await check();
      if (!update) { setUpdateStatus({ state: "idle" }); return; }
      let downloaded = 0;
      let contentLength = 0;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            setUpdateStatus({ state: "downloading", percent: 0 });
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

  const handleStartupUpgrade = useCallback(async () => {
    setShowStartupUpdateDialog(false);
    if (!startupUpdate) return;
    try {
      let downloaded = 0;
      let contentLength = 0;
      await startupUpdate.downloadAndInstall((event) => {
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
      invoke("open_github").catch(() => {});
    }
  }, [startupUpdate]);

  const handleSkipVersion = useCallback(() => {
    if (startupUpdate) {
      localStorage.setItem("llm-switch-skipped-version", startupUpdate.version);
    }
    setShowStartupUpdateDialog(false);
    setStartupUpdate(null);
  }, [startupUpdate]);

  const handleDismissStartupUpdate = useCallback(() => {
    setShowStartupUpdateDialog(false);
    setStartupUpdate(null);
  }, []);

  const handleSwitchActive = useCallback(async (id: string) => {
    try {
      await api.profile.setActive(id);
      setSelectedProfileId(id);
      refresh();
    } catch (e: any) {
      alert(e.toString());
    }
  }, [refresh]);

  const doSync = useCallback(async (profileId: string, hostIds: string[]) => {
    setSyncingProfileId(profileId);
    try {
      const res = await api.sync.toHosts(profileId, hostIds);
      const r = res[0];
      if (r) {
        // Write summary immediately so the card badge shows before refresh completes
        setSyncSummaries((prev) => ({ ...prev, [profileId]: {
          id: "", profile_id: profileId, host_id: r.host_id,
          synced_at: new Date().toISOString(), status: r.success ? "success" : "failed",
          error_message: r.error_message, source_hash: null, target_hash: null,
        }}));
        setFlashProfileId(profileId);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setFlashProfileId(null), 1200);
      }
      if (r?.success) {
        const host = hosts.find((h) => h.id === r.host_id);
        showToast("ok", t("syncHost.syncedTo", { host: host?.name ?? r.host_id }));
      } else {
        showToast("err", r?.error_message ?? t("common.failed"));
      }
      refresh();
    } catch (e: any) {
      showToast("err", e.toString());
    } finally {
      setSyncingProfileId(null);
    }
  }, [hosts, refresh, showToast, t]);

  const handleCardSync = useCallback((profile: Profile) => {
    if (hosts.length === 0) {
      showToast("err", t("syncHost.noHosts"));
      return;
    }
    const def = hosts.find((h) => h.is_default);
    if (def) {
      doSync(profile.id, [def.id]);
    } else {
      setSyncProfileId(profile.id);
    }
  }, [hosts, doSync, showToast, t]);

  const handleCopy = useCallback(async (id: string) => {
    try {
      await api.profile.copy(id);
      setCopyingId(null);
      refresh();
    } catch (err: any) {
      alert(err.toString());
    }
  }, [refresh]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.profile.delete(id);
      setDeletingId(null);
      refresh();
    } catch (err: any) {
      alert(err.toString());
    }
  }, [refresh]);

  const handleReorder = useCallback(async (orderedIds: string[]) => {
    try {
      await api.profile.reorder(orderedIds);
      refresh();
    } catch (err: any) {
      alert(err.toString());
    }
  }, [refresh]);

  const handleOpenSyncHistory = useCallback(() => {
    setGlobalDialog({ open: true, tab: "sync" });
  }, []);

  const settingsProfile = profiles.find((p) => p.id === settingsProfileId) ?? null;
  const syncProfile = profiles.find((p) => p.id === syncProfileId) ?? null;

  if (loading) {
    return <div className="empty-state"><p>{t("common.loading")}</p></div>;
  }

  return (
    <div className="app">
      <TopBar onOpenGlobalSettings={() => setGlobalDialog({ open: true, tab: "hosts" })} />

      <main className="dashboard">
        <ProfileGrid
          profiles={profiles}
          selectedId={selectedProfileId}
          onSelect={setSelectedProfileId}
          onSwitchActive={handleSwitchActive}
          onOpenSettings={(p) => setSettingsProfileId(p.id)}
          onSync={handleCardSync}
          onCopy={(id) => setCopyingId(id)}
          onDelete={(id) => setDeletingId(id)}
          onReorder={handleReorder}
          onRenamed={refresh}
          syncingId={syncingProfileId}
          syncSummaries={syncSummaries}
          latestSyncId={latestSyncId}
          flashProfileId={flashProfileId}
          hostNames={hostNames}
          onOpenSyncHistory={handleOpenSyncHistory}
        />
      </main>

      <button className="fab" onClick={() => setNewOpen(true)} title={t("sidebar.newProfile")}>
        <IconPlus size={22} />
      </button>

      {settingsProfile && (
        <ProfileSettingsDialog profile={settingsProfile} onClose={() => setSettingsProfileId(null)} onSaved={refresh} />
      )}
      {syncProfile && (
        <SyncHostDialog
          profile={syncProfile}
          hosts={hosts}
          onClose={() => setSyncProfileId(null)}
          onSynced={(hostId) => { doSync(syncProfile.id, [hostId]); setSyncProfileId(null); }}
        />
      )}
      {globalDialog.open && (
        <GlobalSettingsDialog
          tab={globalDialog.tab}
          hosts={hosts}
          profiles={profiles}
          onRefreshHosts={refresh}
          onClose={() => setGlobalDialog({ open: false, tab: "hosts" })}
          updateStatus={updateStatus}
          appVersion={appVersion}
          onCheckUpdate={handleCheckUpdate}
          onDownloadInstall={handleDownloadAndInstall}
          onGoToDownload={handleGoToDownload}
        />
      )}
      {newOpen && (
        <NewProfileDialog onClose={() => setNewOpen(false)} onCreated={refresh} />
      )}

      {deletingId && (
        <ConfirmDialog
          message={t("sidebar.confirmDelete", { name: profiles.find((p) => p.id === deletingId)?.name ?? "" })}
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
      {copyingId && (
        <ConfirmDialog
          message={t("sidebar.confirmCopy")}
          onConfirm={() => handleCopy(copyingId)}
          onCancel={() => setCopyingId(null)}
        />
      )}

      {syncToast && (
        <div className={`app-toast app-toast--${syncToast.kind}`}>{syncToast.msg}</div>
      )}

      {showStartupUpdateDialog && startupUpdate && (
        <div className="dialog-overlay" onClick={handleDismissStartupUpdate}>
          <div className="dialog dialog--sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title">{t("updater.startupNewVersion")}</h3>
            <p className="dialog-sub" style={{ marginBottom: 8 }}>
              {t("updater.startupNewVersionDesc", { version: startupUpdate.version, currentVersion: appVersion ? `v${appVersion}` : "" })}
            </p>
            {startupUpdate.body && (
              <p style={{ color: "var(--ink-faint)", fontSize: "var(--fs-sm)", marginBottom: 12, maxHeight: 120, overflowY: "auto", textAlign: "left" }}>
                {startupUpdate.body}
              </p>
            )}
            <div className="dialog-actions" style={{ justifyContent: "center" }}>
              <button className="btn btn--ghost" onClick={handleDismissStartupUpdate}>{t("common.cancel")}</button>
              <button className="btn btn--ghost" onClick={handleSkipVersion}>{t("updater.skipVersion")}</button>
              <button className="btn btn--primary" onClick={handleStartupUpgrade}>{t("updater.upgrade")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
