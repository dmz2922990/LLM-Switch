import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Profile, Host, ReminderConfig, SyncHistory } from "./types";
import { api } from "./api";
import i18n from "./i18n";
import { TopBar } from "./components/TopBar";
import { ProfileGrid } from "./components/ProfileGrid";
import { ProfileSettingsDialog } from "./components/ProfileSettingsDialog";
import { SyncHostDialog } from "./components/SyncHostDialog";
import { GlobalSettingsDialog } from "./components/GlobalSettingsDialog";
import { NewProfileDialog } from "./components/NewProfileDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Dialog } from "./components/Dialog";
import { IconCheck, IconServer, IconX } from "./components/icons";
import type { UpdateStatus } from "./components/AboutPanel";

type GlobalTab = "hosts" | "sync" | "activation" | "reminder" | "about";

function App() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
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
  const [reminderConfigs, setReminderConfigs] = useState<ReminderConfig[]>([]);

  const hostNames = useMemo(
    () => Object.fromEntries(hosts.map((h) => [h.id, h.name])),
    [hosts],
  );

  const activeProfile = useMemo(
    () => profiles.find((p) => p.is_active) ?? null,
    [profiles],
  );

  const defaultHost = useMemo(
    () => hosts.find((h) => h.is_default) ?? null,
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
      const [p, h, hist, rem] = await Promise.all([
        api.profile.list(),
        api.host.list(),
        api.sync.history(),
        api.reminder.listConfigs(),
      ]);
      setProfiles(p);
      setHosts(h);
      setReminderConfigs(rem);
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
      setLoadFailed(false);
    } catch (e) {
      console.error("Failed to load data:", e);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    refresh();
    getVersion().then(setAppVersion);
  }, [refresh]);

  // Fallback: retry loading every 2s while in failed state, in case the
  // db-ready event raced past the listener registration.
  useEffect(() => {
    if (!loadFailed || dbError) return;
    const timer = setInterval(() => refresh(), 2000);
    return () => clearInterval(timer);
  }, [loadFailed, dbError, refresh]);

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
    const unlistenActivation = listen("activation-completed", () => refresh());
    const unlistenDbReady = listen("db-ready", () => refresh());
    const unlistenDbError = listen<string>("db-error", (e) => setDbError(e.payload));
    return () => {
      unlistenAbout.then((fn) => fn());
      unlistenSwitched.then((fn) => fn());
      unlistenFileChanged.then((fn) => fn());
      unlistenActivation.then((fn) => fn());
      unlistenDbReady.then((fn) => fn());
      unlistenDbError.then((fn) => fn());
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
      showToast("err", e.toString());
    }
  }, [refresh, showToast]);

  const doSync = useCallback(async (profileId: string, hostIds: string[]) => {
    setSyncingProfileId(profileId);
    try {
      const res = await api.sync.toHosts(profileId, hostIds);
      const okCount = res.filter((r) => r.success).length;
      const failCount = res.length - okCount;
      const last = res[res.length - 1];
      if (last) {
        setSyncSummaries((prev) => ({ ...prev, [profileId]: {
          id: "", profile_id: profileId, host_id: last.host_id,
          synced_at: new Date().toISOString(), status: last.success ? "success" : "failed",
          error_message: last.error_message, source_hash: null, target_hash: null,
        }}));
        setFlashProfileId(profileId);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setFlashProfileId(null), 1200);
      }
      if (failCount === 0) {
        const names = res.map((r) => hosts.find((h) => h.id === r.host_id)?.name ?? r.host_id).join(", ");
        showToast("ok", t("syncHost.syncedTo", { host: names }));
      } else if (okCount === 0) {
        const firstFail = res.find((r) => !r.success);
        showToast("err", firstFail?.error_message ?? t("common.failed"));
      } else {
        showToast("err", t("syncHost.partialFail", { ok: okCount, fail: failCount }));
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
      showToast("err", err.toString());
    }
  }, [refresh, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.profile.delete(id);
      setDeletingId(null);
      refresh();
    } catch (err: any) {
      showToast("err", err.toString());
    }
  }, [refresh, showToast]);

  const handleReorder = useCallback(async (orderedIds: string[]) => {
    try {
      await api.profile.reorder(orderedIds);
      refresh();
    } catch (err: any) {
      showToast("err", err.toString());
    }
  }, [refresh, showToast]);

  const handleOpenSyncHistory = useCallback(() => {
    setGlobalDialog({ open: true, tab: "sync" });
  }, []);

  const settingsProfile = profiles.find((p) => p.id === settingsProfileId) ?? null;
  const syncProfile = profiles.find((p) => p.id === syncProfileId) ?? null;

  if (loading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (loadFailed && profiles.length === 0) {
    return (
      <div className="empty-state">
        <p>{t("common.loadFailed")}</p>
        {dbError && (
          <p className="empty-sub">{dbError}</p>
        )}
        <button className="btn btn--primary" onClick={() => refresh()}>{t("common.retry")}</button>
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar
        activeProfileName={activeProfile?.name ?? null}
        onNewProfile={() => setNewOpen(true)}
        onOpenGlobalSettings={() => setGlobalDialog({ open: true, tab: "hosts" })}
      />

      <main className="dashboard">
        <div className="dashboard-inner">
          {profiles.length > 0 && (
            <div className="dashboard-header">
              <div className="dashboard-heading">
                <h1 className="dashboard-title">{t("sidebar.title")}</h1>
                <span className="dashboard-count">
                  {t("sidebar.profileCount", { count: profiles.length })}
                </span>
              </div>
              {defaultHost && (
                <button
                  className="dashboard-host-pill"
                  onClick={() => setGlobalDialog({ open: true, tab: "hosts" })}
                  title={`${defaultHost.username}@${defaultHost.address}:${defaultHost.port}`}
                >
                  <IconServer size={12} />
                  <span className="dashboard-host-label">{t("sidebar.defaultHostLabel")}:</span>
                  <span className="dashboard-host-name">{defaultHost.name}</span>
                </button>
              )}
            </div>
          )}

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
            onNewProfile={() => setNewOpen(true)}
            syncingId={syncingProfileId}
            syncSummaries={syncSummaries}
            latestSyncId={latestSyncId}
            flashProfileId={flashProfileId}
            hostNames={hostNames}
            reminderConfigs={reminderConfigs}
            onOpenSyncHistory={handleOpenSyncHistory}
            onError={(msg) => showToast("err", msg)}
          />
        </div>
      </main>

      {settingsProfile && (
        <ProfileSettingsDialog profile={settingsProfile} onClose={() => setSettingsProfileId(null)} onSaved={refresh} />
      )}
      {syncProfile && (
        <SyncHostDialog
          profile={syncProfile}
          hosts={hosts}
          onClose={() => setSyncProfileId(null)}
          onSynced={(hostIds) => { doSync(syncProfile.id, hostIds); setSyncProfileId(null); }}
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
          variant="danger"
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
        <div className={`app-toast app-toast--${syncToast.kind}`} role="status">
          <span className="app-toast-icon">
            {syncToast.kind === "ok" ? <IconCheck size={13} /> : <IconX size={13} />}
          </span>
          <span>{syncToast.msg}</span>
        </div>
      )}

      {showStartupUpdateDialog && startupUpdate && (
        <Dialog
          title={t("updater.startupNewVersion")}
          size="sm"
          onClose={handleDismissStartupUpdate}
          center
          actions={
            <>
              <button className="btn btn--ghost" onClick={handleDismissStartupUpdate}>{t("common.cancel")}</button>
              <button className="btn btn--ghost" onClick={handleSkipVersion}>{t("updater.skipVersion")}</button>
              <button className="btn btn--primary" onClick={handleStartupUpgrade}>{t("updater.upgrade")}</button>
            </>
          }
        >
          <p className="dialog-sub" style={{ marginBottom: 10 }}>
            {t("updater.startupNewVersionDesc", { version: startupUpdate.version, currentVersion: appVersion ? `v${appVersion}` : "" })}
          </p>
          {startupUpdate.body && (
            <div className="update-release-notes">
              {startupUpdate.body}
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}

export default App;
