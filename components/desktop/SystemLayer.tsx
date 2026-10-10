"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { setSystemMode, useSystemMode } from "@/lib/system";
import { BootScreen } from "./BootScreen";
import { Screensaver } from "./Screensaver";
import { PowerOffScreen, ShutdownDialog } from "./ShutdownDialog";
import { topVisibleId, useWindowManager } from "./WindowManager";

/** Сколько рабочий стол должен простоять пустым и без ввода, чтобы включилась заставка. */
const IDLE_MS = 90_000;

/** Системные экраны поверх рабочего стола: загрузка, завершение работы, заставка. */
export function SystemLayer() {
  const mode = useSystemMode();
  const { state } = useWindowManager();
  const desktopEmptyRef = useRef(true);

  useEffect(() => {
    desktopEmptyRef.current = topVisibleId(state) === null;
  });

  // Заставка включается сама только на пустом рабочем столе, чтобы не мешать чтению.
  useEffect(() => {
    if (mode !== "desktop") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const ready =
          desktopEmptyRef.current &&
          !document.hidden &&
          !document.documentElement.hasAttribute("data-boot") &&
          !prefersReducedMotion();
        if (ready) setSystemMode("screensaver");
        else arm();
      }, IDLE_MS);
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((type) => window.addEventListener(type, arm, { passive: true }));
    arm();
    return () => {
      clearTimeout(timer);
      events.forEach((type) => window.removeEventListener(type, arm));
    };
  }, [mode]);

  return (
    <>
      <BootScreen />
      {mode === "shutdown" && <ShutdownDialog />}
      {mode === "off" && <PowerOffScreen />}
      {mode === "screensaver" && <Screensaver />}
    </>
  );
}
