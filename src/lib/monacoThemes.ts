// Monaco themes aligned to the modern Linear/Raycast-inspired palette.
// Canvas-based editor cannot read CSS vars, so colors are hardcoded per theme.

const darkJsonRules = [
  { token: "string.key.json", foreground: "8b95ff" },
  { token: "string.value.json", foreground: "5eead4" },
  { token: "number", foreground: "fbbf24" },
  { token: "keyword.json", foreground: "c084fc" },
  { token: "delimiter", foreground: "6b7280" },
];

const lightJsonRules = [
  { token: "string.key.json", foreground: "4f46e5" },
  { token: "string.value.json", foreground: "047857" },
  { token: "number", foreground: "b45309" },
  { token: "keyword.json", foreground: "7c3aed" },
  { token: "delimiter", foreground: "64748b" },
];

const darkColors: Record<string, string> = {
  "editor.background": "#0a0b0e",
  "editor.foreground": "#f0f2f5",
  "editorLineNumber.foreground": "#4b5263",
  "editorLineNumber.activeForeground": "#949ba8",
  "editor.selectionBackground": "rgba(110, 123, 242, 0.28)",
  "editor.inactiveSelectionBackground": "rgba(110, 123, 242, 0.14)",
  "editor.lineHighlightBackground": "#13151a",
  "editorCursor.foreground": "#818cf8",
  "editorBracketMatch.background": "rgba(110, 123, 242, 0.2)",
  "editorBracketMatch.border": "#6e7bf2",
  "editorSuggestWidget.background": "#13151a",
  "editorSuggestWidget.selectedBackground": "#1e222b",
  "editorSuggestWidget.border": "#262a35",
  "editorWidget.background": "#13151a",
  "editorWidget.border": "#262a35",
  "editor.findMatchBackground": "rgba(251, 191, 36, 0.28)",
  "editorIndentGuide.background1": "#1c1f28",
};

const lightColors: Record<string, string> = {
  "editor.background": "#f9fafb",
  "editor.foreground": "#111827",
  "editorLineNumber.foreground": "#9ca3af",
  "editorLineNumber.activeForeground": "#4b5563",
  "editor.selectionBackground": "rgba(79, 70, 229, 0.16)",
  "editor.inactiveSelectionBackground": "rgba(79, 70, 229, 0.08)",
  "editor.lineHighlightBackground": "#f1f3f6",
  "editorCursor.foreground": "#4f46e5",
  "editorBracketMatch.background": "rgba(79, 70, 229, 0.14)",
  "editorBracketMatch.border": "#4f46e5",
  "editorSuggestWidget.background": "#ffffff",
  "editorSuggestWidget.selectedBackground": "#f1f3f6",
  "editorSuggestWidget.border": "#e5e7eb",
  "editorWidget.background": "#ffffff",
  "editorWidget.border": "#e5e7eb",
  "editor.findMatchBackground": "rgba(217, 119, 6, 0.22)",
  "editorIndentGuide.background1": "#e5e7eb",
};

export function defineMonacoThemes(monaco: any) {
  monaco.editor.defineTheme("llm-dark", {
    base: "vs-dark",
    inherit: true,
    rules: darkJsonRules,
    colors: darkColors,
  });
  monaco.editor.defineTheme("llm-light", {
    base: "vs",
    inherit: true,
    rules: lightJsonRules,
    colors: lightColors,
  });
}
