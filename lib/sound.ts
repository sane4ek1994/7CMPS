"use client";

// Звуки системы. Все звуки синтезируются Web Audio API на лету: аудиофайлов нет,
// мелодии написаны для проекта (чужие системные звуки защищены авторским правом).
//
// Браузеры разрешают звук только после действия пользователя, поэтому звуки
// играют в ответ на щелчки и клавиши. Включаются и выключаются значком
// динамика в трее, выбор запоминается в localStorage.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "campus-sound";
/** Звук включён, пока пользователь не выключил его в трее. */
const DEFAULT_ON = true;
const MASTER_VOLUME = 0.14;

interface Tone {
  /** Частота, Гц. */
  f: number;
  /** Задержка от начала звука, с. */
  at?: number;
  /** Длительность, с. */
  d: number;
  /** Частота в конце: тон плавно съезжает к ней. */
  to?: number;
  type?: OscillatorType;
  /** Громкость относительно общей, 0…1. */
  v?: number;
}

let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

function readSetting(): boolean {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === null ? DEFAULT_ON : value === "on";
  } catch {
    return DEFAULT_ON;
  }
}

let soundOn: boolean | null = null;

export function isSoundOn() {
  soundOn ??= readSetting();
  return soundOn;
}

export function setSoundOn(on: boolean) {
  soundOn = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Хранилище недоступно: настройка продержится до перезагрузки.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSoundOn() {
  return useSyncExternalStore(subscribe, isSoundOn, () => DEFAULT_ON);
}

/** Аудиоконтекст создаётся только после первого действия пользователя на странице. */
function audio(): AudioContext | null {
  if (typeof window === "undefined" || document.hidden) return null;
  if (!ctx) {
    // Без действия пользователя браузер не запустит контекст и напишет предупреждение.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    ctx = new AudioCtor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function play(tones: Tone[]) {
  if (!isSoundOn()) return;
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime + 0.01;
  const master = ac.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(ac.destination);
  for (const tone of tones) {
    const start = now + (tone.at ?? 0);
    const end = start + tone.d;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = tone.type ?? "square";
    osc.frequency.setValueAtTime(tone.f, start);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
    // Короткая атака и затухание: без щелчков в начале и конце звука.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.v ?? 1, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

// Ноты для мелодий включения и выключения.
const C4 = 261.63;
const E4 = 329.63;
const G4 = 392.0;
const A4 = 440.0;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;

const arpeggio = (notes: number[], step: number, d: number): Tone[] =>
  notes.map((f, i) => ({ f, at: i * step, d: d - i * step * 0.4, type: "triangle", v: 0.9 }));

export const sounds = {
  /** Включение: восходящее арпеджио с аккордом в конце. */
  startup: () =>
    play([
      ...arpeggio([C4, E4, G4, C5, E5], 0.11, 1.4),
      { f: G5, at: 0.55, d: 1.1, type: "sine", v: 0.5 },
      { f: C5, at: 0.55, d: 1.2, type: "sine", v: 0.6 },
    ]),
  /** Выключение: то же арпеджио вниз, медленнее. */
  shutdown: () => play(arpeggio([E5, C5, A4, G4, C4], 0.14, 1.2)),
  /** Открытие окна: два коротких щелчка вверх. */
  open: () =>
    play([
      { f: 520, d: 0.03, v: 0.5 },
      { f: 780, at: 0.04, d: 0.05, v: 0.5 },
    ]),
  /** Закрытие окна: два щелчка вниз. */
  close: () =>
    play([
      { f: 780, d: 0.03, v: 0.5 },
      { f: 440, at: 0.04, d: 0.05, v: 0.5 },
    ]),
  /** Сворачивание: тон съезжает вниз. */
  minimize: () => play([{ f: 900, to: 260, d: 0.16, type: "triangle" }]),
  /** Разворачивание и восстановление: тон съезжает вверх. */
  maximize: () => play([{ f: 260, to: 900, d: 0.16, type: "triangle" }]),
  /** Меню «Пуск». */
  menu: () => play([{ f: 880, to: 1320, d: 0.06, type: "triangle", v: 0.7 }]),
  /** Диалог: мягкий двузвучный «динь». */
  dialog: () =>
    play([
      { f: E5, d: 0.5, type: "sine" },
      { f: D5 * 2, at: 0.06, d: 0.4, type: "sine", v: 0.35 },
    ]),
  /** Щелчок переключателя. */
  click: () => play([{ f: 1400, d: 0.025, v: 0.4 }]),
};
