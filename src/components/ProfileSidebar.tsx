import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Profile } from "../types";
import { api } from "../api";
import { changeLanguage, getCurrentLanguage } from "../i18n";

interface Props {
  profiles: Profile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onSwitchActive: (id: string) => void;
}

export function ProfileSidebar({ profiles, selectedId, onSelect, onRefresh, onSwitchActive }: Props) {
  const { t } = useTranslation();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmCopyId, setConfirmCopyId] = useState<string | null>(null);

  const currentLang = getCurrentLanguage();

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
      onSwitchActive(id);
      onRefresh();
    } catch (e: any) {
      alert(e.toString());
    }
  };

  const handleCopy = async (id: string) => {
    try {
      await api.profile.copy(id);
      setConfirmCopyId(null);
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
        <h2>{t("sidebar.title")}</h2>
        <button className="btn-primary btn-sm" onClick={() => setShowNew(true)}>+ {t("sidebar.newProfile")}</button>
      </div>

      {showNew && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
          <input
            placeholder={t("sidebar.profileName")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button className="btn-primary btn-sm" onClick={handleCreate}>{t("common.confirm")}</button>
            <button className="btn-secondary btn-sm" onClick={() => { setShowNew(false); setError(""); }}>{t("common.cancel")}</button>
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{error}</p>}
        </div>
      )}

      <div className="profile-list">
        {profiles.length === 0 && (
          <div className="empty-state" style={{ padding: 32 }}>
            <p>{t("sidebar.noProfiles")}</p>
            <button className="btn-primary btn-sm" onClick={() => setShowNew(true)}>{t("sidebar.createFirst")}</button>
          </div>
        )}
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`profile-item ${selectedId === p.id ? "active" : ""}`}
            onClick={() => onSelect(p.id)}
          >
            <div className="profile-item-top">
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
            </div>
            <div className="profile-item-actions">
              {p.is_active ? (
                <button className="badge-btn" disabled>{t("sidebar.active")}</button>
              ) : (
                <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleSwitch(p.id); }}>{t("sidebar.switch")}</button>
              )}
              <button className="btn-secondary btn-sm" onClick={(e) => startRename(p, e)} title={t("common.rename")}>✎</button>
              {confirmCopyId === p.id ? (
                <>
                  <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleCopy(p.id); }}>{t("common.confirm")}</button>
                  <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setConfirmCopyId(null); }}>{t("common.cancel")}</button>
                </>
              ) : (
                <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setConfirmCopyId(p.id); }} title={t("common.copy")}>⧉</button>
              )}
              {confirmDeleteId === p.id ? (
                <>
                  <button className="btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>{t("common.confirm")}</button>
                  <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>{t("common.cancel")}</button>
                </>
              ) : (
                <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }} title={t("common.delete")}>✕</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <select value={currentLang} onChange={(e) => { changeLanguage(e.target.value); window.location.reload(); }} className="lang-select">
          <option value="zh-CN">中文</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>
  );
}
