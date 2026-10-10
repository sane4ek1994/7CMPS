"use client";

// Тема хранится атрибутом data-theme на <html>. До первой отрисовки его ставит
// инлайн-скрипт из app/layout.tsx, поэтому светлая тема не мигает перед тёмной.

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type Theme } from "./theme-script";

export type { Theme };

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, () => "light");
}

export function applyTheme(theme: Theme, remember: boolean) {
  document.documentElement.setAttribute("data-theme", theme);
  if (!remember) return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Хранилище недоступно (приватный режим): тема продержится до перезагрузки.
  }
}

export function hasStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark";
  } catch {
    return false;
  }
}
