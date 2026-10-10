"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelText } from "@/components/pixel/PixelText";
import { reboot, setSystemMode } from "@/lib/system";
import { TitleGlyph } from "./TitleGlyph";

type Choice = "off" | "reboot" | "screensaver";

const CHOICES: { value: Choice; label: string }[] = [
  { value: "off", label: "Завершить работу" },
  { value: "reboot", label: "Перезагрузить" },
  { value: "screensaver", label: "Включить заставку" },
];

function cancel() {
  setSystemMode("desktop");
  requestAnimationFrame(() => document.getElementById("start-button")?.focus());
}

/** Диалог «Завершение работы»: экран затемняется сеткой, как в системах тех лет. */
export function ShutdownDialog() {
  const [choice, setChoice] = useState<Choice>("off");
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
  }, []);

  // Фокус не выходит из модального диалога, Esc — то же, что «Отмена».
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>("button, input:checked")];
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (choice === "reboot") reboot();
    else setSystemMode(choice);
  };

  return (
    <div className="shutdown">
      <section
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shutdown-title"
        onKeyDown={onKeyDown}
      >
        <header className="window__titlebar">
          <h2 id="shutdown-title" className="window__title">
            Завершение работы
          </h2>
          <div className="window__controls">
            <button
              type="button"
              className="title-button"
              aria-label="Закрыть диалог"
              title="Закрыть"
              onClick={cancel}
            >
              <span className="title-button__face">
                <TitleGlyph name="close" />
              </span>
            </button>
          </div>
        </header>
        <form className="dialog__body" onSubmit={onSubmit}>
          <PixelIcon name="power" size={48} className="dialog__icon" />
          <fieldset className="dialog__choices">
            <legend>Что сделать с кампусом?</legend>
            {CHOICES.map((item) => (
              <label key={item.value} className="radio">
                <input
                  type="radio"
                  name="shutdown-choice"
                  value={item.value}
                  checked={choice === item.value}
                  onChange={() => setChoice(item.value)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="dialog__buttons">
            <button type="submit" className="btn btn--default">
              ОК
            </button>
            <button type="button" className="btn" onClick={cancel}>
              Отмена
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/** Экран после завершения работы. Щелчок или клавиша «включают» кампус заново. */
export function PowerOffScreen() {
  const [phase, setPhase] = useState<"closing" | "off">("closing");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const timer = setTimeout(() => setPhase("off"), 1600);
    return () => clearTimeout(timer);
  }, []);

  const powerOn = () => {
    if (phase === "off") reboot();
  };

  return (
    <div
      ref={ref}
      className={`power-off power-off--${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label="Кампус выключен"
      tabIndex={-1}
      onClick={powerOn}
      onKeyDown={powerOn}
    >
      {phase === "closing" ? (
        <>
          <PixelText text="7 Кампус" pixel={8} shadow="#000033" className="power-off__logo" />
          <p className="power-off__wait" role="status">
            Подождите, идёт завершение работы…
          </p>
        </>
      ) : (
        <>
          <p className="power-off__text" role="status">
            Теперь компьютер можно выключить.
          </p>
          <p className="power-off__hint">
            Щёлкните или нажмите любую клавишу, чтобы включить снова
          </p>
        </>
      )}
    </div>
  );
}
