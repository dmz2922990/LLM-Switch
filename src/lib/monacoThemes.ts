// Monaco themes aligned to the bench-instrument tokens (term-bg / ink / signal).
// Canvas-based editor cannot read CSS vars, so colors are hardcoded per theme.

const sharedJsonRules = [
  { token: "string.key.json", foreground: "4fd6c2" },
  { token: "string.value.json", foreground: "7ee787" },
  { token: "number", foreground: "f2a65a" },
  { token: "keyword.json", foreground: "c792ea" },
  { token: "delimiter", foreground: "9aa0ad" },
];

const darkColors: Record<string, string> = {
  "editor.background": "#0e1014",
  "editor.foreground": "#e6e9ef",
  "editorLineNumber.foreground": "#5c6270",
  "editorLineNumber.activeForeground": "#9aa0ad",
  "editor.selectionBackground": "rgba(79, 214, 194, 0.26)",
  "editor.inactiveSelectionBackground": "rgba(79, 214, 194, 0.14)",
  "editor.lineHighlightBackground": "#1b1e24",
  "editorCursor.foreground": "#4fd6c2",
  "editorBracketMatch.background": "rgba(79, 214, 194, 0.18)",
  "editorBracketMatch.border": "#4fd6c2",
  "editorSuggestWidget.background": "#1b1e24",
  "editorSuggestWidget.selectedBackground": "#232730",
  "editorSuggestWidget.border": "#2e333c",
  "editorWidget.background": "#1b1e24",
  "editorWidget.border": "#2e333c",
  "editor.findMatchBackground": "rgba(242, 166, 90, 0.3)",
  "editorIndentGuide.background1": "#232730",
};

const lightColors: Record<string, string> = {
  "editor.background": "#fbfaf5",
  "editor.foreground": "#2b2e33",
  "editorLineNumber.foreground": "#8b9099",
  "editorLineNumber.activeForeground": "#5b616e",
  "editor.selectionBackground": "rgba(12, 127, 115, 0.2)",
  "editor.inactiveSelectionBackground": "rgba(12, 127, 115, 0.1)",
  "editor.lineHighlightBackground": "#ffffff",
  "editorCursor.foreground": "#0c7f73",
  "editorBracketMatch.background": "rgba(12, 127, 115, 0.16)",
  "editorBracketMatch.border": "#0c7f73",
  "editorSuggestWidget.background": "#ffffff",
  "editorSuggestWidget.selectedBackground": "#efebe2",
  "editorSuggestWidget.border": "#ddd8cb",
  "editorWidget.background": "#ffffff",
  "editorWidget.border": "#ddd8cb",
  "editor.findMatchBackground": "rgba(176, 106, 22, 0.28)",
  "editorIndentGuide.background1": "#e4dfd3",
};

export function defineMonacoThemes(monaco: any) {
  monaco.editor.defineTheme("llm-dark", {
    base: "vs-dark",
    inherit: true,
    rules: sharedJsonRules,
    colors: darkColors,
  });
  monaco.editor.defineTheme("llm-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "string.key.json", foreground: "0c7f73" },
      { token: "string.value.json", foreground: "187a43" },
      { token: "number", foreground: "b06a16" },
      { token: "keyword.json", foreground: "8445c0" },
      { token: "delimiter", foreground: "5b616e" },
    ],
    colors: lightColors,
  });
}
