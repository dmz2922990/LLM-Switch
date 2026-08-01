import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

export const THEME_KEY = "llm-switch-theme";

const listeners = new Set<() => void>();

function getSystemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  return attr === "light" || attr === "dark" ? attr : getSystemTheme();
}

function emit() {
  listeners.forEach((l) => l());
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem(THEME_KEY, t);
  emit();
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

/** Idempotent — safe to call from main.tsx before render. */
export function initTheme() {
  document.documentElement.dataset.theme = getTheme();
}

function subscribeTheme(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme);
}
