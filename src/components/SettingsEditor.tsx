import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Editor from "@monaco-editor/react";
import type { Profile } from "../types";
import { api } from "../api";

interface Props {
  profile: Profile;
  onSaved: () => void;
}

interface QuickSettings {
  baseUrl: string;
  authToken: string;
  opusModel: string;
  sonnetModel: string;
  haikuModel: string;
}

export function SettingsEditor({ profile, onSaved }: Props) {
  const { t } = useTranslation();
  const [content, setContent] = useState(profile.settings_json);
  const [savedContent, setSavedContent] = useState(profile.settings_json);
  const [error, setError] = useState<string | null>(null);
  const [quickSettings, setQuickSettings] = useState<QuickSettings>({
    baseUrl: "",
    authToken: "",
    opusModel: "",
    sonnetModel: "",
    haikuModel: "",
  });
  const editorRef = useRef<any>(null);

  const parseQuickSettings = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      const env = parsed.env || {};
      setQuickSettings({
        baseUrl: env.ANTHROPIC_BASE_URL || "",
        authToken: env.ANTHROPIC_AUTH_TOKEN || "",
        opusModel: env.ANTHROPIC_DEFAULT_OPUS_MODEL || "",
        sonnetModel: env.ANTHROPIC_DEFAULT_SONNET_MODEL || "",
        haikuModel: env.ANTHROPIC_DEFAULT_HAIKU_MODEL || "",
      });
    } catch {
      // Keep existing values if parse fails
    }
  }, []);

  useEffect(() => {
    setContent(profile.settings_json);
    setSavedContent(profile.settings_json);
    setError(null);
    parseQuickSettings(profile.settings_json);
  }, [profile.id, profile.settings_json, parseQuickSettings]);

  const hasChanges = content !== savedContent;

  const updateJsonFromQuickSetting = useCallback((key: keyof QuickSettings, value: string) => {
    try {
      const parsed = JSON.parse(content);
      if (!parsed.env) parsed.env = {};
      const envKey = {
        baseUrl: "ANTHROPIC_BASE_URL",
        authToken: "ANTHROPIC_AUTH_TOKEN",
        opusModel: "ANTHROPIC_DEFAULT_OPUS_MODEL",
        sonnetModel: "ANTHROPIC_DEFAULT_SONNET_MODEL",
        haikuModel: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      }[key];
      parsed.env[envKey] = value;
      const newContent = JSON.stringify(parsed, null, 2);
      setContent(newContent);
      setQuickSettings((prev) => ({ ...prev, [key]: value }));
      setError(null);
    } catch {
      setError(t("editor.invalidJson"));
    }
  }, [content, t]);

  const handleSave = useCallback(async () => {
    try {
      JSON.parse(content);
    } catch {
      setError(t("editor.invalidJson"));
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
  }, [content, profile.id, onSaved, t]);

  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(content), null, 2);
      setContent(formatted);
      setError(null);
    } catch {
      setError(t("editor.formatFailed"));
    }
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (v: string | undefined) => {
    const newContent = v || "";
    setContent(newContent);
    parseQuickSettings(newContent);
  };

  return (
    <div className="editor-container" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 24px", borderBottom: "1px solid var(--border)" }}>
        <button className="btn-primary btn-sm" onClick={handleSave} disabled={!hasChanges}>
          {t("common.save")}
        </button>
        <button className="btn-secondary btn-sm" onClick={handleFormat}>
          {t("editor.format")}
        </button>
        {hasChanges && (
          <span style={{ fontSize: 12, color: "var(--warning)" }}>{t("editor.unsaved")}</span>
        )}
        {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
        {profile.is_active && (
          <span style={{ fontSize: 12, color: "var(--accent)", marginLeft: "auto" }}>{t("editor.activeHint")}</span>
        )}
      </div>

      <div className="quick-settings" style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 12 }}>
        <div className="form-group" style={{ flex: "1 1 300px", minWidth: 200 }}>
          <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>Base URL</label>
          <input
            value={quickSettings.baseUrl}
            onChange={(e) => updateJsonFromQuickSetting("baseUrl", e.target.value)}
            placeholder="https://api.anthropic.com"
          />
        </div>
        <div className="form-group" style={{ flex: "1 1 200px", minWidth: 150 }}>
          <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>Auth Token</label>
          <input
            type="password"
            value={quickSettings.authToken}
            onChange={(e) => updateJsonFromQuickSetting("authToken", e.target.value)}
            placeholder="sk-ant-..."
          />
        </div>
        <div className="form-group" style={{ flex: "1 1 150px", minWidth: 120 }}>
          <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>Opus Model</label>
          <input
            value={quickSettings.opusModel}
            onChange={(e) => updateJsonFromQuickSetting("opusModel", e.target.value)}
            placeholder="claude-opus-4"
          />
        </div>
        <div className="form-group" style={{ flex: "1 1 150px", minWidth: 120 }}>
          <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>Sonnet Model</label>
          <input
            value={quickSettings.sonnetModel}
            onChange={(e) => updateJsonFromQuickSetting("sonnetModel", e.target.value)}
            placeholder="claude-sonnet-4"
          />
        </div>
        <div className="form-group" style={{ flex: "1 1 150px", minWidth: 120 }}>
          <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>Haiku Model</label>
          <input
            value={quickSettings.haikuModel}
            onChange={(e) => updateJsonFromQuickSetting("haikuModel", e.target.value)}
            placeholder="claude-haiku-3-5"
          />
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language="json"
          theme="vs-dark"
          value={content}
          onChange={handleEditorChange}
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
