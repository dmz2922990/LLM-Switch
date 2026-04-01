import { useState, type Dispatch, type SetStateAction } from "react";
import type { Host } from "../types";
import { api } from "../api";

interface Props {
  hosts: Host[];
  onRefresh: () => void;
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

function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>确认操作</h3>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>取消</button>
          <button className="btn-danger" onClick={onConfirm}>确认删除</button>
        </div>
      </div>
    </div>
  );
}

function HostForm({ editing, form, setForm, onSave, onCancel }: {
  editing: Host | null;
  form: FormData;
  setForm: Dispatch<SetStateAction<FormData>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? "编辑主机" : "添加主机"}</h3>
        <div className="form-group">
          <label>名称</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="form-group" style={{ flex: 3 }}>
            <label>地址</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>端口</label>
            <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
          </div>
        </div>
        <div className="form-group">
          <label>用户名</label>
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </div>
        <div className="form-group">
          <label>认证方式</label>
          <select value={form.auth_type} onChange={(e) => setForm({ ...form, auth_type: e.target.value as "password" | "key" })}>
            <option value="password">密码</option>
            <option value="key">SSH 密钥</option>
          </select>
        </div>
        {form.auth_type === "password" ? (
          <div className="form-group">
            <label>密码</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        ) : (
          <div className="form-group">
            <label>密钥路径</label>
            <input value={form.key_path} onChange={(e) => setForm({ ...form, key_path: e.target.value })} placeholder="~/.ssh/id_rsa" />
          </div>
        )}
        <div className="form-group">
          <label>远程路径</label>
          <input value={form.remote_path} onChange={(e) => setForm({ ...form, remote_path: e.target.value })} />
        </div>
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>取消</button>
          <button className="btn-primary" onClick={onSave}>{editing ? "保存" : "添加"}</button>
        </div>
      </div>
    </div>
  );
}

export function HostManager({ hosts, onRefresh }: Props) {
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
      setTestResult((prev) => ({ ...prev, [h.id]: `failed: ${e}` }));
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
      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>远程主机</h2>
        <button className="btn-primary btn-sm" onClick={() => { resetForm(); setShowAdd(true); }}>+ 添加主机</button>
      </div>
      {hosts.length === 0 ? (
        <div className="empty-state"><p>尚未添加远程主机</p></div>
      ) : (
        <div className="host-list">
          {hosts.map((h) => (
            <div key={h.id} className="host-card">
              <div className="host-info">
                <div className="host-name">{h.name}</div>
                <div className="host-detail">{h.username}@{h.address}:{h.port} → {h.remote_path}</div>
                {testResult[h.id] && (
                  <div style={{ fontSize: 12, marginTop: 4, color: testResult[h.id] === "success" ? "var(--success)" : "var(--danger)" }}>
                    {testResult[h.id] === "success" ? "连接成功" : testResult[h.id]}
                  </div>
                )}
              </div>
              <div className="host-actions">
                <button className="btn-secondary btn-sm" onClick={() => handleTest(h)} disabled={testing === h.id}>
                  测试
                </button>
                <button className="btn-secondary btn-sm" onClick={() => startEdit(h)}>编辑</button>
                <button className="btn-danger btn-sm" onClick={() => setDeletingId(h.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd && <HostForm editing={null} form={form} setForm={setForm} onSave={handleAdd} onCancel={() => { setShowAdd(false); resetForm(); }} />}
      {editing && <HostForm editing={editing} form={form} setForm={setForm} onSave={handleEdit} onCancel={() => { setEditing(null); resetForm(); }} />}
      {deletingId && <ConfirmDialog message="确认删除此主机？同步历史也将被清除。" onConfirm={() => handleDelete(deletingId)} onCancel={() => setDeletingId(null)} />}
    </div>
  );
}
