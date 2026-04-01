import { useState } from "react";
import type { Profile, Host, SyncResult, SyncHistory } from "../types";
import { api } from "../api";

interface Props {
  profiles: Profile[];
  hosts: Host[];
}

export function SyncPanel({ profiles, hosts }: Props) {
  const [selectedProfile, setSelectedProfile] = useState("");
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const toggleHost = (id: string) => {
    setSelectedHosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSync = async () => {
    if (!selectedProfile || selectedHosts.size === 0) return;
    setSyncing(true);
    setResults([]);
    try {
      const res = await api.sync.toHosts(selectedProfile, Array.from(selectedHosts));
      setResults(res);
    } catch (e: any) {
      alert(e.toString());
    } finally {
      setSyncing(false);
    }
  };

  const loadHistory = async () => {
    try {
      const h = await api.sync.history(selectedProfile || undefined);
      setHistory(h);
      setShowHistory(true);
    } catch (e: any) {
      alert(e.toString());
    }
  };

  return (
    <div className="scroll-area">
      <div className="sync-panel">
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>远程同步</h2>

        <div className="form-group">
          <label>选择配置档案</label>
          <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)}>
            <option value="">-- 请选择 --</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name} {p.is_active ? "(活跃)" : ""}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>选择目标主机</label>
          {hosts.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>请先在"主机管理"中添加远程主机</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {hosts.map((h) => (
                <label key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={selectedHosts.has(h.id)}
                    onChange={() => toggleHost(h.id)}
                    style={{ width: "auto" }}
                  />
                  {h.name} ({h.address}:{h.port})
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-primary"
            onClick={handleSync}
            disabled={!selectedProfile || selectedHosts.size === 0 || syncing}
          >
            {syncing ? "同步中..." : "同步"}
          </button>
          <button className="btn-secondary" onClick={loadHistory}>同步历史</button>
        </div>

        {results.length > 0 && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>同步结果</h3>
            {results.map((r, i) => {
              const host = hosts.find((h) => h.id === r.host_id);
              return (
                <div key={i} className={`sync-result ${r.success ? "success" : "failure"}`}>
                  <span>{r.success ? "✓" : "✕"}</span>
                  <span>{host?.name ?? r.host_id}: {r.success ? "成功" : r.error_message}</span>
                </div>
              );
            })}
          </div>
        )}

        {showHistory && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>同步历史</h3>
            {history.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>暂无同步记录</p>
            ) : (
              history.map((h) => (
                <div key={h.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: h.status === "success" ? "var(--success)" : "var(--danger)" }}>
                    {h.status === "success" ? "✓" : "✕"}
                  </span>
                  {" "}{h.synced_at} — {h.profile_id.slice(0, 8)}... → {h.host_id.slice(0, 8)}...
                  {h.error_message && <span style={{ color: "var(--danger)" }}> {h.error_message}</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
