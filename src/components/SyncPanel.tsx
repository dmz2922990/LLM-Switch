import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Profile, Host, SyncResult, SyncHistory } from "../types";
import { api } from "../api";

interface Props {
  profiles: Profile[];
  hosts: Host[];
  onRefresh: () => void;
}

function formatSyncDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function SyncPanel({ profiles, hosts, onRefresh }: Props) {
  const { t } = useTranslation();
  const [selectedProfile, setSelectedProfile] = useState(() => {
    const active = profiles.find((p) => p.is_active);
    return active?.id ?? "";
  });
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(() => {
    const def = hosts.find((h) => h.is_default);
    return def ? new Set([def.id]) : new Set();
  });
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 4;

  useEffect(() => {
    if (!selectedProfile) {
      const active = profiles.find((p) => p.is_active);
      if (active) setSelectedProfile(active.id);
    }
  }, [profiles]);

  useEffect(() => {
    if (selectedHosts.size === 0 && hosts.length > 0) {
      const def = hosts.find((h) => h.is_default);
      if (def) setSelectedHosts(new Set([def.id]));
    }
  }, [hosts]);

  useEffect(() => {
    loadHistory();
  }, []);

  const toggleHost = (id: string) => {
    setSelectedHosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSync = async () => {
    if (!selectedProfile || selectedHosts.size === 0) return;
    setSyncing(true);
    setResults([]);
    try {
      const res = await api.sync.toHosts(
        selectedProfile,
        Array.from(selectedHosts),
      );
      setResults(res);
      setHistoryPage(1);
      await loadHistory();
    } catch (e: any) {
      alert(e.toString());
    } finally {
      setSyncing(false);
    }
  };

  const loadHistory = async () => {
    try {
      const h = await api.sync.history();
      setHistory(h);
    } catch {
      // ignore
    }
  };

  const handleSetDefault = async (hostId: string) => {
    try {
      await api.host.setDefault(hostId);
      onRefresh();
    } catch (e: any) {
      alert(e.toString());
    }
  };

  return (
    <div className="scroll-area">
      <div className="sync-panel">
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{t("sync.title")}</h2>

        <div className="form-group">
          <label>{t("sync.selectProfile")}</label>
          <select
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
          >
            <option value="">-- {t("sync.selectProfile")} --</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.is_active ? `(${t("sidebar.active")})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 6,
              display: "block",
            }}
          >
            {t("sync.selectHost")}
          </label>
          {hosts.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {t("sync.pleaseAddHost")}
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              {hosts.map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      flex: 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedHosts.has(h.id)}
                      onChange={() => toggleHost(h.id)}
                      style={{ width: "auto" }}
                    />
                    {h.name} ({h.address}:{h.port})
                    {h.is_default && (
                      <span className="default-badge">
                        {t("sync.defaultHost")}
                      </span>
                    )}
                  </label>
                  {!h.is_default && (
                    <button
                      className="set-default-btn"
                      onClick={() => handleSetDefault(h.id)}
                    >
                      {t("sync.setDefault")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-primary"
            onClick={handleSync}
            disabled={
              !selectedProfile || selectedHosts.size === 0 || syncing
            }
          >
            {syncing ? t("sync.syncing") : t("sync.syncButton")}
          </button>
        </div>

        {results.length > 0 && (
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {t("sync.syncResult")}
            </h3>
            {results.map((r, i) => {
              const host = hosts.find((h) => h.id === r.host_id);
              return (
                <div
                  key={i}
                  className={`sync-result ${r.success ? "success" : "failure"}`}
                >
                  <span>{r.success ? "✓" : "✕"}</span>
                  <span>
                    {host?.name ?? r.host_id}:{" "}
                    {r.success ? t("common.success") : r.error_message}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
              marginTop: 8,
            }}
          >
            {t("sync.syncHistory")}
          </h3>
          {history.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {t("sync.noRecords")}
            </p>
          ) : (
            <>
              {history
                .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                .map((h) => {
                  const hostName =
                    hosts.find((x) => x.id === h.host_id)?.name ?? "Unknown";
                  const profileName =
                    profiles.find((p) => p.id === h.profile_id)?.name ?? "Unknown";
                  const src = h.source_hash ?? t("sync.hashNA");
                  const tgt = h.target_hash ?? t("sync.hashNA");
                  return (
                    <div key={h.id} className="sync-history-item">
                      <span
                        style={{
                          color:
                            h.status === "success"
                              ? "var(--success)"
                              : "var(--danger)",
                        }}
                      >
                        {h.status === "success" ? "✓" : "✕"}
                      </span>{" "}
                      {formatSyncDate(h.synced_at)} - {hostName} - {profileName} -{" "}
                      {src} → {tgt}
                      {h.error_message && (
                        <span style={{ color: "var(--danger)" }}>
                          {" "}
                          ({h.error_message})
                        </span>
                      )}
                    </div>
                  );
                })}
              {history.length > historyPageSize && (
                <div className="pagination">
                  <button
                    className="btn-secondary btn-sm"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => p - 1)}
                  >
                    {t("sync.prevPage")}
                  </button>
                  <span className="pagination-info">
                    {historyPage} / {Math.ceil(history.length / historyPageSize)}
                  </span>
                  <button
                    className="btn-secondary btn-sm"
                    disabled={historyPage * historyPageSize >= history.length}
                    onClick={() => setHistoryPage((p) => p + 1)}
                  >
                    {t("sync.nextPage")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
