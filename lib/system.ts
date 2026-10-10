"use client";

// Состояние «системы» поверх рабочего стола: диалог завершения работы,
// экран выключения и заставка. Хранится вне React, чтобы меню «Пуск»
// и слой с экранами могли менять его, не зная друг о друге.

import { useSyncExternalStore } from "react";
import { BOOT_STORAGE_KEY } from "./boot-script";

export type SystemMode = "desktop" | "shutdown" | "off" | "screensaver";
/** Пункты меню «Пуск», которые не открывают окно, а запускают действие. */
export type SystemAction = "shutdown" | "screensaver";

let mode: SystemMode = "desktop";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSystemMode(next: SystemMode) {
  if (mode === next) return;
  mode = next;
  listeners.forEach((listener) => listener());
}

export function useSystemMode(): SystemMode {
  return useSyncExternalStore(
    subscribe,
    () => mode,
    () => "desktop",
  );
}

/** «Перезагрузка»: чистый рабочий стол и загрузочный экран, как после включения. */
export function reboot() {
  try {
    sessionStorage.removeItem(BOOT_STORAGE_KEY);
  } catch {
    // Хранилище недоступно: перезагрузимся без загрузочного экрана.
  }
  // Нужна именно полная перезагрузка: она закрывает все окна и заново запускает
  // инлайн-скрипт загрузочного экрана. Переход роутером оставил бы окна открытыми.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/");
}
