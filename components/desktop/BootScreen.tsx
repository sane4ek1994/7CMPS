"use client";

import { useEffect } from "react";
import { PixelText } from "@/components/pixel/PixelText";

const endBoot = () => document.documentElement.removeAttribute("data-boot");

/**
 * Загрузочный экран. Разметка есть на каждой странице, но видна, только если
 * инлайн-скрипт из lib/boot-script.ts поставил атрибут data-boot на <html>.
 * Исчезает сам через пару секунд; щелчок или любая клавиша его пропускают.
 */
export function BootScreen() {
  useEffect(() => {
    if (!document.documentElement.hasAttribute("data-boot")) return;
    window.addEventListener("keydown", endBoot, { once: true });
    return () => window.removeEventListener("keydown", endBoot);
  }, []);

  return (
    <div
      className="boot"
      aria-hidden="true"
      onPointerDown={endBoot}
      onAnimationEnd={(event) => {
        if (event.animationName === "boot-out") endBoot();
      }}
    >
      <PixelText text="7 Кампус" pixel={10} shadow="#000033" className="boot__logo" />
      <p className="boot__name">DevOps Campus</p>
      <p className="boot__status">
        Загрузка рабочего стола<span className="boot__dots">...</span>
      </p>
      <div className="boot__bar" />
    </div>
  );
}
