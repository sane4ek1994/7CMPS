"use client";

import { useEffect } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { sounds } from "@/lib/sound";
import { applyTheme, hasStoredTheme, useTheme } from "@/lib/theme";

/** Кнопка в системном трее: переключает светлую и тёмную тему. */
export function ThemeToggle() {
  const theme = useTheme();
  const dark = theme === "dark";

  // Пока пользователь не выбрал тему сам, сайт следует за настройкой системы.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!hasStoredTheme()) applyTheme(media.matches ? "dark" : "light", false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={dark}
      aria-label="Тёмная тема"
      title={dark ? "Включить светлую тему" : "Включить тёмную тему"}
      onClick={() => {
        sounds.click();
        applyTheme(dark ? "light" : "dark", true);
      }}
    >
      <PixelIcon name={dark ? "sun" : "moon"} size={18} />
    </button>
  );
}
