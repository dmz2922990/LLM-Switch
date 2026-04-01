import { useState } from "react";
import type { Profile } from "../types";
import { api } from "../api";

interface Props {
  profiles: Profile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

export function ProfileSidebar({ profiles, selectedId, onSelect, onRefresh }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      setError("");
      await api.profile.create(newName.trim());
      setNewName("");
      setShowNew(false);
      onRefresh();
    } catch (e: any) {
      setError(e.toString());
    }
  };

  const handleSwitch = async (id: string) => {
    try {
      await api.profile.setActive(id);
      onRefresh();
    } catch (e: any) {
      alert(e.toString());
    }
  };

  const handleCopy = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.profile.copy(id);
      onRefresh();
    } catch (err: any) {
      alert(err.toString());
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.profile.delete(id);
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err: any) {
      alert(err.toString());
    }
  };

  const startRename = (p: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenaming(p.id);
    setRenameVal(p.name);
  };

  const commitRename = async () => {
    if (!renaming || !renameVal.trim()) { setRenaming(null); return; }
    try {
      await api.profile.rename(renaming, renameVal.trim());
      setRenaming(null);
      onRefresh();
    } catch (err: any) {
      alert(err.toString());
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>配置档案</h2>
        <button className="btn-primary btn-sm" onClick={() => setShowNew(true)}>+ 新建</button>
      </div>

      {showNew && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
          <input
            placeholder="档案名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button className="btn-primary btn-sm" onClick={handleCreate}>确定</button>
            <button className="btn-secondary btn-sm" onClick={() => { setShowNew(false); setError(""); }}>取消</button>
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{error}</p>}
        </div>
      )}

      <div className="profile-list">
        {profiles.length === 0 && (
          <div className="empty-state" style={{ padding: 32 }}>
            <p>尚未创建配置档案</p>
            <button className="btn-primary btn-sm" onClick={() => setShowNew(true)}>创建第一个</button>
          </div>
        )}
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`profile-item ${selectedId === p.id ? "active" : ""}`}
            onClick={() => onSelect(p.id)}
          >
            {renaming === p.id ? (
              <input
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(null); }}
                onBlur={commitRename}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, padding: "2px 6px", fontSize: 12 }}
              />
            ) : (
              <span className="name">{p.name}</span>
            )}
            {p.is_active && <span className="badge">活跃</span>}
            <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
              {!p.is_active && (
                <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleSwitch(p.id); }}>切换</button>
              )}
              <button className="btn-secondary btn-sm" onClick={(e) => startRename(p, e)} title="重命名">✎</button>
              <button className="btn-secondary btn-sm" onClick={(e) => handleCopy(p.id, e)} title="复制">⧉</button>
              {confirmDeleteId === p.id ? (
                <>
                  <button className="btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>确认</button>
                  <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>取消</button>
                </>
              ) : (
                <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }} title="删除">✕</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
