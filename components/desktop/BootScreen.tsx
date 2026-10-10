"use client";

import { useEffect } from "react";
import { PixelText } from "@/components/pixel/PixelText";
import { sounds } from "@/lib/sound";

const endBoot = () => document.documentElement.removeAttribute("data-boot");

/**
 * Пропуск загрузки щелчком или клавишей. При первой загрузке страницы браузер не даёт
 * играть звук до действия пользователя, поэтому мелодия включения звучит здесь.
 * После перезагрузки из меню она уже прозвучала (data-boot="sound").
 */
function skipBoot() {
  const boot = document.documentElement.getAttribute("data-boot");
  if (boot === null) return;
  endBoot();
  if (boot !== "sound") sounds.startup();
}

/**
 * Загрузочный экран. Разметка есть на каждой странице, но видна, только если
 * инлайн-скрипт из lib/boot-script.ts поставил атрибут data-boot на <html>.
 * Исчезает сам через пару секунд; щелчок или любая клавиша его пропускают.
 */
export function BootScreen() {
  useEffect(() => {
    window.addEventListener("keydown", skipBoot);
    return () => window.removeEventListener("keydown", skipBoot);
  }, []);

  return (
    <div
      className="boot"
      aria-hidden="true"
      onPointerDown={skipBoot}
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
