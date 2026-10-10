"use client";

import { PixelIcon } from "@/components/pixel/PixelIcon";
import { setSoundOn, sounds, useSoundOn } from "@/lib/sound";

/** Значок динамика в системном трее: включает и выключает звуки системы. */
export function SoundToggle() {
  const on = useSoundOn();

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={on}
      aria-label="Звуки системы"
      title={on ? "Выключить звуки" : "Включить звуки"}
      onClick={() => {
        setSoundOn(!on);
        if (!on) sounds.click();
      }}
    >
      <PixelIcon name={on ? "speaker" : "speakerOff"} size={18} />
    </button>
  );
}
