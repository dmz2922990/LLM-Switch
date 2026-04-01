import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import type { Profile } from "../types";
import { api } from "../api";

interface Props {
  profile: Profile;
  onSaved: () => void;
}

export function SettingsEditor({ profile, onSaved }: Props) {
  const [content, setContent] = useState(profile.settings_json);
  const [savedContent, setSavedContent] = useState(profile.settings_json);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setContent(profile.settings_json);
    setSavedContent(profile.settings_json);
    setError(null);
  }, [profile.id, profile.settings_json]);

  const hasChanges = content !== savedContent;

  const handleSave = useCallback(async () => {
    try {
      JSON.parse(content);
    } catch {
      setError("JSON 格式无效，请检查语法");
      return;
    }
    try {
      setError(null);
      await api.profile.updateSettings(profile.id, content);
      setSavedContent(content);
      onSaved();
    } catch (e: any) {
      setError(e.toString());
    }
  }, [content, profile.id, onSaved]);

  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(content), null, 2);
      setContent(formatted);
      setError(null);
    } catch {
      setError("无法格式化：JSON 格式无效");
    }
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="editor-container" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 24px", borderBottom: "1px solid var(--border)" }}>
        <button className="btn-primary btn-sm" onClick={handleSave} disabled={!hasChanges}>
          保存
        </button>
        <button className="btn-secondary btn-sm" onClick={handleFormat}>
          格式化
        </button>
        {hasChanges && (
          <span style={{ fontSize: 12, color: "var(--warning)" }}>未保存的修改</span>
        )}
        {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
        {profile.is_active && (
          <span style={{ fontSize: 12, color: "var(--accent)", marginLeft: "auto" }}>活跃档案 — 保存后自动生效</span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language="json"
          theme="vs-dark"
          value={content}
          onChange={(v) => setContent(v || "")}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
