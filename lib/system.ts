"use client";

// Состояние «системы» поверх рабочего стола: диалог завершения работы,
// экраны выключения и перезагрузки, заставка. Хранится вне React, чтобы меню
// «Пуск» и слой с экранами могли менять его, не зная друг о друге.

import { useSyncExternalStore } from "react";

export type SystemMode =
  | "desktop"
  | "shutdown"
  /** «Подождите, идёт завершение работы…», затем экран выключения. */
  | "off"
  /** «Подождите, идёт завершение работы…», затем загрузка. */
  | "restart"
  /** Загрузка: окна закрываются, показывается загрузочный экран. */
  | "boot"
  | "screensaver";
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
