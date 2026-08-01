import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Editor from "@monaco-editor/react";
import type { Profile } from "../types";
import { api } from "../api";
import { useTheme } from "../theme";
import { defineMonacoThemes } from "../lib/monacoThemes";

interface Props {
  profile: Profile;
  onSaved: () => void;
}

interface QuickSettings {
  baseUrl: string;
  authToken: string;
  model: string;
  opusModel: string;
  sonnetModel: string;
  haikuModel: string;
}

export function SettingsEditor({ profile, onSaved }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [content, setContent] = useState(profile.settings_json);
  const [savedContent, setSavedContent] = useState(profile.settings_json);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [quickSettings, setQuickSettings] = useState<QuickSettings>({
    baseUrl: "",
    authToken: "",
    model: "",
    opusModel: "",
    sonnetModel: "",
    haikuModel: "",
  });
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const parseQuickSettings = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      const env = parsed.env || {};
      setQuickSettings({
        baseUrl: env.ANTHROPIC_BASE_URL || "",
        authToken: env.ANTHROPIC_AUTH_TOKEN || "",
        model: env.ANTHROPIC_MODEL || "",
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
        model: "ANTHROPIC_MODEL",
        opusModel: "ANTHROPIC_DEFAULT_OPUS_MODEL",
        sonnetModel: "ANTHROPIC_DEFAULT_SONNET_MODEL",
        haikuModel: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      }[key];
      const isModelField = ["model", "opusModel", "sonnetModel", "haikuModel"].includes(key);
      if (isModelField && value.trim() === "") {
        delete parsed.env[envKey];
      } else {
        parsed.env[envKey] = value;
      }
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
      setShowSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
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

  const doEditorCopy = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    const text = editor.getModel()?.getValueInRange(selection);
    if (text) api.clipboard.write(text);
    setContextMenu(null);
  }, []);

  const doEditorCut = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    const text = editor.getModel()?.getValueInRange(selection);
    if (text) {
      api.clipboard.write(text);
      editor.executeEdits("cut", [{ range: selection, text: "" }]);
    }
    setContextMenu(null);
  }, []);

  const doSelectAll = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (model) editor.setSelection(model.getFullModelRange());
    setContextMenu(null);
  }, []);

  // Intercept Cmd+C/X/S via capture-phase keydown to write to system clipboard / save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const editor = editorRef.current;

      if (e.key === "s") {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
        return;
      }

      if (!editor || !editor.hasTextFocus()) return;

      if (e.key === "c") {
        e.preventDefault();
        e.stopPropagation();
        const selection = editor.getSelection();
        const text = editor.getModel()?.getValueInRange(selection);
        if (text) api.clipboard.write(text);
      } else if (e.key === "x") {
        e.preventDefault();
        e.stopPropagation();
        const selection = editor.getSelection();
        const text = editor.getModel()?.getValueInRange(selection);
        if (text) {
          api.clipboard.write(text);
          editor.executeEdits("cut", [{ range: selection, text: "" }]);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleSave]);

  // Clear save toast timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Close custom context menu on outside interaction
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    defineMonacoThemes(monaco);
    monaco.editor.setTheme(theme === "dark" ? "llm-dark" : "llm-light");
    const editorDom = editor.getDomNode();
    if (editorDom) {
      editorDom.addEventListener(
        "contextmenu",
        (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY });
        },
        true
      );
    }
  };

  const handleEditorChange = (v: string | undefined) => {
    const newContent = v || "";
    setContent(newContent);
    parseQuickSettings(newContent);
  };

  const editorTheme = theme === "dark" ? "llm-dark" : "llm-light";

  // Keep Monaco theme in sync with the app theme (editor may mount after init)
  useEffect(() => {
    monacoRef.current?.editor.setTheme(editorTheme);
  }, [editorTheme]);

  return (
    <div className="editor-container">
      <div className="toolbar">
        <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={!hasChanges}>
          {t("common.save")}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={handleFormat}>
          {t("editor.format")}
        </button>
        {hasChanges && (
          <span className="status-text status-text--warn">{t("editor.unsaved")}</span>
        )}
        {error && <span className="status-text status-text--err">{error}</span>}
        {profile.is_active && (
          <span className="status-text status-text--rx" style={{ marginLeft: "auto" }}>{t("editor.activeHint")}</span>
        )}
      </div>

      <div className="quick-settings">
        <div className="form-group form-group--wide">
          <label className="field-label">{t("editor.quickBaseUrl")}</label>
          <input
            value={quickSettings.baseUrl}
            onChange={(e) => updateJsonFromQuickSetting("baseUrl", e.target.value)}
            placeholder="https://api.anthropic.com"
          />
        </div>
        <div className="form-group form-group--md">
          <label className="field-label">{t("editor.quickAuthToken")}</label>
          <input
            type="password"
            value={quickSettings.authToken}
            onChange={(e) => updateJsonFromQuickSetting("authToken", e.target.value)}
            placeholder="sk-ant-..."
          />
        </div>
        <div className="form-group form-group--sm">
          <label className="field-label">{t("editor.quickModel")}</label>
          <input
            value={quickSettings.model}
            onChange={(e) => updateJsonFromQuickSetting("model", e.target.value)}
            placeholder="claude-sonnet-4-20250514"
          />
        </div>
        <div className="form-group form-group--sm">
          <label className="field-label">{t("editor.quickHaikuModel")}</label>
          <input
            value={quickSettings.haikuModel}
            onChange={(e) => updateJsonFromQuickSetting("haikuModel", e.target.value)}
            placeholder="claude-haiku-3-5"
          />
        </div>
        <div className="form-group form-group--sm">
          <label className="field-label">{t("editor.quickSonnetModel")}</label>
          <input
            value={quickSettings.sonnetModel}
            onChange={(e) => updateJsonFromQuickSetting("sonnetModel", e.target.value)}
            placeholder="claude-sonnet-4"
          />
        </div>
        <div className="form-group form-group--sm">
          <label className="field-label">{t("editor.quickOpusModel")}</label>
          <input
            value={quickSettings.opusModel}
            onChange={(e) => updateJsonFromQuickSetting("opusModel", e.target.value)}
            placeholder="claude-opus-4"
          />
        </div>
      </div>

      <div className="editor-host">
        <Editor
          height="100%"
          language="json"
          theme={editorTheme}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            contextmenu: false,
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
        {showSaved && (
          <div className="toast">
            {t("editor.saved")}
          </div>
        )}
        {contextMenu && (
          <div
            className="ctx-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ctx-menu-item" onClick={doEditorCopy}>
              <span>{t("editor.contextCopy")}</span>
              <kbd>⌘C</kbd>
            </div>
            <div className="ctx-menu-item" onClick={doEditorCut}>
              <span>{t("editor.contextCut")}</span>
              <kbd>⌘X</kbd>
            </div>
            <div className="ctx-menu-sep" />
            <div className="ctx-menu-item" onClick={doSelectAll}>
              <span>{t("editor.contextSelectAll")}</span>
              <kbd>⌘A</kbd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
