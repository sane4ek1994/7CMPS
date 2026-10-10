"use client";

// Звуки системы в духе конца 90-х. Все звуки синтезируются Web Audio API на лету:
// аудиофайлов нет, мелодии написаны для проекта (системные звуки Windows принадлежат
// Microsoft). Похожими их делает звучание: тёплые аккорды-пэды, колокольчики,
// «вжух» из шума, общая реверберация и приглушённые верха, как у WAV 22 кГц.
//
// Браузеры разрешают звук только после действия пользователя, поэтому звуки
// играют в ответ на щелчки и клавиши. Включаются и выключаются значком
// динамика в трее, выбор запоминается в localStorage.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "campus-sound";
/** Звук включён, пока пользователь не выключил его в трее. */
const DEFAULT_ON = true;
const MASTER_VOLUME = 0.8;

// ---------------------------------------------------------------- Настройка

const listeners = new Set<() => void>();
let soundOn: boolean | null = null;

function readSetting(): boolean {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === null ? DEFAULT_ON : value === "on";
  } catch {
    return DEFAULT_ON;
  }
}

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

// ---------------------------------------------------------------- Звуковой тракт

/** Общая шина: голоса идут напрямую и через реверберацию, дальше фильтр и лимитер. */
interface Bus {
  ac: BaseAudioContext;
  dry: AudioNode;
  reverb: AudioNode;
  noise: AudioBuffer;
}

function noiseBuffer(ac: BaseAudioContext, seconds: number, decay = 0): AudioBuffer {
  const length = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (decay ? (1 - i / length) ** decay : 1);
    }
  }
  return buffer;
}

function createBus(ac: BaseAudioContext, destination: AudioNode): Bus {
  const master = ac.createGain();
  master.gain.value = MASTER_VOLUME;
  // Верха срезаны около 8 кГц: так звучали системные WAV с частотой 22 кГц.
  const tone = ac.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 8000;
  tone.Q.value = 0.5;
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  master.connect(tone).connect(limiter).connect(destination);

  const dry = ac.createGain();
  dry.connect(master);
  const reverb = ac.createConvolver();
  reverb.buffer = noiseBuffer(ac, 2.2, 3);
  const wet = ac.createGain();
  wet.gain.value = 0.3;
  reverb.connect(wet).connect(master);

  return { ac, dry, reverb, noise: noiseBuffer(ac, 1) };
}

/** Выход голоса: прямой сигнал плюс посыл в реверберацию. */
function voice(bus: Bus, send: number): GainNode {
  const out = bus.ac.createGain();
  out.connect(bus.dry);
  const toReverb = bus.ac.createGain();
  toReverb.gain.value = send;
  out.connect(toReverb).connect(bus.reverb);
  return out;
}

/** Огибающая: быстрая атака до level и экспоненциальное затухание к концу. */
function envelope(param: AudioParam, t: number, attack: number, level: number, end: number) {
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(level, t + attack);
  param.exponentialRampToValueAtTime(0.0001, end);
}

// Негармонические обертоны колокольчика: [отношение частот, громкость, доля длительности].
const BELL_PARTIALS = [
  [1, 1, 1],
  [2, 0.45, 0.7],
  [2.76, 0.3, 0.45],
  [5.4, 0.12, 0.25],
  [8.93, 0.05, 0.15],
] as const;

/** Колокольчик: удар и долгое затухание. */
function bell(bus: Bus, t: number, f: number, d: number, v: number) {
  const out = voice(bus, 0.6);
  for (const [ratio, amp, part] of BELL_PARTIALS) {
    const osc = bus.ac.createOscillator();
    osc.frequency.value = f * ratio;
    const gain = bus.ac.createGain();
    envelope(gain.gain, t, 0.004, v * amp, t + d * part);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + d * part + 0.05);
  }
}

/** Пэд: аккорд из слегка расстроенных пил через мягко открывающийся фильтр. */
function pad(bus: Bus, t: number, freqs: number[], d: number, v: number, attack = 0.5) {
  const out = voice(bus, 0.5);
  const filter = bus.ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(500, t);
  filter.frequency.exponentialRampToValueAtTime(2400, t + attack);
  filter.frequency.exponentialRampToValueAtTime(700, t + d);
  const env = bus.ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(v, t + attack);
  env.gain.setValueAtTime(v, t + Math.max(attack, d * 0.45));
  env.gain.exponentialRampToValueAtTime(0.0001, t + d);
  filter.connect(env).connect(out);
  const level = 1 / (freqs.length * 2);
  for (const f of freqs) {
    for (const detune of [-7, 7]) {
      const osc = bus.ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      osc.detune.value = detune;
      const gain = bus.ac.createGain();
      gain.gain.value = level;
      osc.connect(gain).connect(filter);
      osc.start(t);
      osc.stop(t + d + 0.05);
    }
  }
}

/** «Вжух»: шум через полосовой фильтр, частота которого съезжает from → to. */
function whoosh(bus: Bus, t: number, from: number, to: number, d: number, v: number) {
  const src = bus.ac.createBufferSource();
  src.buffer = bus.noise;
  src.loop = true;
  const filter = bus.ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + d);
  const gain = bus.ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(v, t + d * 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(filter).connect(gain).connect(voice(bus, 0.25));
  src.start(t);
  src.stop(t + d + 0.05);
}

/** Тихий механический щелчок. */
function tick(bus: Bus, t: number, v: number) {
  const src = bus.ac.createBufferSource();
  src.buffer = bus.noise;
  const filter = bus.ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2500;
  const gain = bus.ac.createGain();
  envelope(gain.gain, t, 0.002, v, t + 0.035);
  src.connect(filter).connect(gain).connect(voice(bus, 0.1));
  src.start(t);
  src.stop(t + 0.06);
}

// ---------------------------------------------------------------- Звуки

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
// Ноты по номерам MIDI: C4 = 60.
const C3 = hz(48);
const D3 = hz(50);
const F3 = hz(53);
const G3 = hz(55);
const A3 = hz(57);
const C4 = hz(60);
const D4 = hz(62);
const E4 = hz(64);
const F4 = hz(65);
const G4 = hz(67);
const C5 = hz(72);
const E5 = hz(76);
const F5 = hz(77);
const G5 = hz(79);
const A5 = hz(81);
const C6 = hz(84);
const D6 = hz(86);
const E6 = hz(88);

type Recipe = (bus: Bus, t: number) => void;

const recipes = {
  /** Включение: два тёплых аккорда с переливом колокольчиков, около 4 секунд. */
  startup: (bus, t) => {
    pad(bus, t, [F3, A3, E4, G4], 2.4, 0.5, 0.7);
    pad(bus, t + 1.7, [C3, G3, D4, E4], 2.4, 0.5, 0.6);
    [A5, C6, E6].forEach((f, i) => bell(bus, t + 0.3 + i * 0.2, f, 1.6, 0.22));
    [G5, D6].forEach((f, i) => bell(bus, t + 1.8 + i * 0.22, f, 1.6, 0.2));
    bell(bus, t + 2.4, E6, 2.2, 0.18);
  },
  /** Выключение: колокольчики вниз и аккорды, которые затихают. */
  shutdown: (bus, t) => {
    [E6, C6, A5, F5].forEach((f, i) => bell(bus, t + i * 0.18, f, 1.4, 0.2));
    pad(bus, t + 0.05, [D3, A3, F4, C5], 1.7, 0.45, 0.4);
    pad(bus, t + 1.2, [C3, F3, A3, C4], 1.8, 0.4, 0.4);
    bell(bus, t + 1.3, C5, 2, 0.2);
  },
  /** Диалог: колокольный аккорд. */
  dialog: (bus, t) => {
    [C5, E5, G5, C6].forEach((f, i) => bell(bus, t + i * 0.012, f, 1.4, 0.18));
    pad(bus, t, [C4, G4], 0.9, 0.18, 0.02);
  },
  /** Открытие окна: «вжух» вверх и искорка в конце. */
  open: (bus, t) => {
    whoosh(bus, t, 500, 3000, 0.26, 0.5);
    bell(bus, t + 0.2, A5, 0.5, 0.08);
  },
  /** Закрытие окна: «вжух» вниз. */
  close: (bus, t) => whoosh(bus, t, 3000, 500, 0.24, 0.5),
  /** Сворачивание: долгий «вжух» вниз, к панели задач. */
  minimize: (bus, t) => whoosh(bus, t, 2400, 320, 0.34, 0.45),
  /** Разворачивание и восстановление: «вжух» вверх. */
  // Полоса шума уже на низких частотах, поэтому громкость чуть выше, чем у сворачивания.
  maximize: (bus, t) => whoosh(bus, t, 320, 2400, 0.34, 0.7),
  /** Меню «Пуск»: щелчок и короткий шелест. */
  menu: (bus, t) => {
    tick(bus, t, 0.5);
    whoosh(bus, t, 1500, 3500, 0.09, 0.15);
  },
  /** Щелчок переключателя. */
  click: (bus, t) => tick(bus, t, 0.6),
} satisfies Record<string, Recipe>;

export type SoundName = keyof typeof recipes;

// ---------------------------------------------------------------- Воспроизведение

let live: Bus | null = null;

/** Аудиоконтекст создаётся только после первого действия пользователя на странице. */
function liveBus(): Bus | null {
  if (typeof window === "undefined" || document.hidden) return null;
  if (!live) {
    // Без действия пользователя браузер не запустит контекст и напишет предупреждение.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    const ac = new AudioCtor();
    live = createBus(ac, ac.destination);
  }
  const ac = live.ac as AudioContext;
  if (ac.state === "suspended") void ac.resume();
  return live;
}

function play(name: SoundName) {
  if (!isSoundOn()) return;
  const bus = liveBus();
  if (bus) recipes[name](bus, bus.ac.currentTime + 0.02);
}

export const sounds = Object.fromEntries(
  (Object.keys(recipes) as SoundName[]).map((name) => [name, () => play(name)]),
) as Record<SoundName, () => void>;
