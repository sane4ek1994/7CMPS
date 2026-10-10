"use client";

import { useEffect, useRef } from "react";
import { setSystemMode } from "@/lib/system";

/** Размер «пикселя» заставки в CSS-пикселях: холст рисуется крупными точками. */
const PIXEL = 3;
const STAR_COUNT = 240;
/** Скорость полёта: какую долю пути до зрителя звезда проходит за секунду. */
const SPEED = 0.32;
/** Первые мгновения ввод не выключает заставку: иначе её закрыл бы тот же щелчок. */
const GRACE_MS = 600;

interface Star {
  x: number;
  y: number;
  z: number;
}

const spawn = (z = Math.random()): Star => ({
  x: Math.random() * 2 - 1,
  y: Math.random() * 2 - 1,
  z: Math.max(z, 0.05),
});

/** Заставка «Звёзды»: полёт сквозь пиксельное звёздное поле. Любой ввод её закрывает. */
export function Screensaver() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const startedAt = performance.now();
    const stars = Array.from({ length: STAR_COUNT }, () => spawn());
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = startedAt;

    const resize = () => {
      width = canvas.width = Math.ceil(window.innerWidth / PIXEL);
      height = canvas.height = Math.ceil(window.innerHeight / PIXEL);
    };

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const cx = width / 2;
      const cy = height / 2;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        star.z -= SPEED * dt;
        const sx = Math.round(cx + (star.x / star.z) * cx);
        const sy = Math.round(cy + (star.y / star.z) * cy);
        if (star.z <= 0.05 || sx < 0 || sy < 0 || sx >= width || sy >= height) {
          stars[i] = spawn(1);
          continue;
        }
        // Дальние звёзды тусклые и мелкие, ближние — яркие и крупнее.
        ctx.fillStyle = star.z > 0.66 ? "#808080" : star.z > 0.33 ? "#c0c0c0" : "#ffffff";
        const size = star.z < 0.2 ? 2 : 1;
        ctx.fillRect(sx, sy, size, size);
      }
      frame = requestAnimationFrame(draw);
    };

    let pointerStart: { x: number; y: number } | null = null;
    const exit = (event: Event) => {
      if (performance.now() - startedAt < GRACE_MS) return;
      if (event instanceof PointerEvent && event.type === "pointermove") {
        pointerStart ??= { x: event.clientX, y: event.clientY };
        const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
        if (moved < 12) return;
      }
      if (event.type === "keydown") event.preventDefault();
      setSystemMode("desktop");
    };

    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    resize();
    window.addEventListener("resize", resize);
    events.forEach((type) => window.addEventListener(type, exit, { capture: true }));
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      events.forEach((type) => window.removeEventListener(type, exit, { capture: true }));
    };
  }, []);

  return <canvas ref={canvasRef} className="screensaver" aria-hidden="true" />;
}
