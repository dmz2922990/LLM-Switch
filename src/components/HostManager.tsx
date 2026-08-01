import { useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type { Host } from "../types";
import { api } from "../api";
import { Dialog } from "./Dialog";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  hosts: Host[];
  onRefresh: () => void;
  embedded?: boolean;
}

type FormData = {
  name: string;
  address: string;
  port: number;
  username: string;
  auth_type: "password" | "key";
  password: string;
  key_path: string;
  remote_path: string;
};

function HostForm({ editing, form, setForm, onSave, onCancel }: {
  editing: Host | null;
  form: FormData;
  setForm: Dispatch<SetStateAction<FormData>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog
      title={editing ? t("host.editHost") : t("host.addHost")}
      onClose={onCancel}
      actions={
        <>
          <button className="btn btn--ghost" onClick={onCancel}>{t("common.cancel")}</button>
          <button className="btn btn--primary" onClick={onSave}>{editing ? t("common.save") : t("host.addHost")}</button>
        </>
      }
    >
      <div className="form-group">
        <label>{t("host.name")}</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="form-row">
        <div className="form-group" style={{ flex: 3 }}>
          <label>{t("host.address")}</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>{t("host.port")}</label>
          <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-group">
        <label>{t("host.username")}</label>
        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      </div>
      <div className="form-group">
        <label>{t("host.authType")}</label>
        <select value={form.auth_type} onChange={(e) => setForm({ ...form, auth_type: e.target.value as "password" | "key" })}>
          <option value="password">{t("host.password")}</option>
          <option value="key">{t("host.sshKey")}</option>
        </select>
      </div>
      {form.auth_type === "password" ? (
        <div className="form-group">
          <label>{t("host.password")}</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
      ) : (
        <div className="form-group">
          <label>{t("host.keyPath")}</label>
          <input value={form.key_path} onChange={(e) => setForm({ ...form, key_path: e.target.value })} placeholder="~/.ssh/id_rsa" />
        </div>
      )}
      <div className="form-group">
        <label>{t("host.remotePath")}</label>
        <input value={form.remote_path} onChange={(e) => setForm({ ...form, remote_path: e.target.value })} />
      </div>
    </Dialog>
  );
}

export function HostManager({ hosts, onRefresh, embedded }: Props) {
  const { t } = useTranslation();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Host | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", address: "", port: 22, username: "",
    auth_type: "password" as "password" | "key",
    password: "", key_path: "", remote_path: "~/.claude/settings.json",
  });

  const resetForm = () => setForm({
    name: "", address: "", port: 22, username: "",
    auth_type: "password", password: "", key_path: "", remote_path: "~/.claude/settings.json",
  });

  const handleAdd = async () => {
    try {
      await api.host.create({
        name: form.name, address: form.address, port: form.port,
        username: form.username, auth_type: form.auth_type,
        password: form.auth_type === "password" ? form.password : undefined,
        key_path: form.auth_type === "key" ? form.key_path : undefined,
        remote_path: form.remote_path,
      });
      resetForm();
      setShowAdd(false);
      onRefresh();
    } catch (e: any) { alert(e.toString()); }
  };

  const handleEdit = async () => {
    if (!editing) return;
    try {
      await api.host.update({
        id: editing.id, name: form.name, address: form.address, port: form.port,
        username: form.username, password: form.password || undefined,
        key_path: form.key_path || undefined, remote_path: form.remote_path,
      });
      setEditing(null);
      resetForm();
      onRefresh();
    } catch (e: any) { alert(e.toString()); }
  };

  const handleTest = async (h: Host) => {
    setTesting(h.id);
    setTestResult((prev) => ({ ...prev, [h.id]: "testing..." }));
    try {
      await api.host.testSaved(h.id);
      setTestResult((prev) => ({ ...prev, [h.id]: "success" }));
    } catch (e: any) {
      const errorMsg = e.toString();
      if (errorMsg.includes("ERROR:DECRYPT_FAILED")) {
        setTestResult((prev) => ({ ...prev, [h.id]: `failed: ${t("errors.decryptFailed")}` }));
      } else {
        setTestResult((prev) => ({ ...prev, [h.id]: `failed: ${errorMsg}` }));
      }
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.host.delete(id);
      setDeletingId(null);
      onRefresh();
    } catch (e: any) { alert(e.toString()); }
  };

  const startEdit = (h: Host) => {
    setEditing(h);
    setForm({
      name: h.name, address: h.address, port: h.port, username: h.username,
      auth_type: h.auth_type as "password" | "key", password: "", key_path: h.key_path ?? "",
      remote_path: h.remote_path,
    });
  };

  return (
    <div className="scroll-area">
      <div className="panel-header">
        {!embedded && <h2 className="panel-title">{t("host.title")}</h2>}
        <button className="btn btn--primary btn--sm" style={{ marginLeft: "auto" }} onClick={() => { resetForm(); setShowAdd(true); }}>{t("host.addHost")}</button>
      </div>
      {hosts.length === 0 ? (
        <div className="empty-state"><p>{t("host.noHosts")}</p></div>
      ) : (
        <div className="host-list">
          {hosts.map((h) => (
            <div key={h.id} className="host-card">
              <div className="host-info">
                <div className="host-name">{h.name}</div>
                <div className="host-detail">{h.username}@{h.address}:{h.port} → {h.remote_path}</div>
                {testResult[h.id] && (
                  <div className={`host-test-result ${testResult[h.id] === "success" ? "is-success" : "is-error"}`}>
                    {testResult[h.id] === "success" ? t("host.connected") : testResult[h.id]}
                  </div>
                )}
              </div>
              <div className="host-actions">
                <button className="btn btn--ghost btn--sm" onClick={() => handleTest(h)} disabled={testing === h.id}>
                  {t("common.test")}
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => startEdit(h)}>{t("common.edit")}</button>
                <button className="btn btn--danger btn--sm" onClick={() => setDeletingId(h.id)}>{t("common.delete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd && <HostForm editing={null} form={form} setForm={setForm} onSave={handleAdd} onCancel={() => { setShowAdd(false); resetForm(); }} />}
      {editing && <HostForm editing={editing} form={form} setForm={setForm} onSave={handleEdit} onCancel={() => { setEditing(null); resetForm(); }} />}
      {deletingId && (
        <ConfirmDialog
          variant="danger"
          message={t("host.confirmDelete")}
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
