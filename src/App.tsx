import { useState, useEffect, useCallback } from "react";
import type { Profile, Host, TabId } from "./types";
import { api } from "./api";
import { ProfileSidebar } from "./components/ProfileSidebar";
import { SettingsEditor } from "./components/SettingsEditor";
import { HostManager } from "./components/HostManager";
import { SyncPanel } from "./components/SyncPanel";

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("editor");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([api.profile.list(), api.host.list()]);
      setProfiles(p);
      setHosts(h);
      if (!selectedProfileId && p.length > 0) {
        setSelectedProfileId(p.find((pr) => pr.is_active)?.id ?? p[0].id);
      }
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;

  if (loading) {
    return <div className="empty-state"><p>Loading...</p></div>;
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
            配置编辑
          </button>
          <button className={`tab ${activeTab === "sync" ? "active" : ""}`} onClick={() => setActiveTab("sync")}>
            远程同步
          </button>
          <button className={`tab ${activeTab === "hosts" ? "active" : ""}`} onClick={() => setActiveTab("hosts")}>
            主机管理
          </button>
        </div>
        <div className="main-body">
          {activeTab === "editor" && (
            selectedProfile ? (
              <SettingsEditor profile={selectedProfile} onSaved={refresh} />
            ) : (
              <div className="empty-state">
                <p>请选择或创建一个配置档案</p>
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
    </>
  );
}

export default App;
