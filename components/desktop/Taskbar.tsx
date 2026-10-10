"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { setSystemMode, type SystemAction } from "@/lib/system";
import { ThemeToggle } from "./ThemeToggle";
import { OpenLink } from "./Window";
import { topVisibleId, useWindowManager, windowDomId } from "./WindowManager";

/** Пункт меню «Пуск»: ссылка на окно или внешнюю страницу либо системное действие. */
export type StartMenuItem = {
  label: string;
  icon: string;
  separatorBefore?: boolean;
} & (
  | { href: string; external?: boolean; action?: never }
  | { action: SystemAction; href?: never; external?: never }
);

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 15_000);
    return () => clearInterval(timer);
  }, []);
  const time = now?.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) ?? "--:--";
  const date = now?.toLocaleDateString("ru-RU", { dateStyle: "full" });
  return (
    <div className="tray">
      <ThemeToggle />
      <time
        className="tray__clock"
        title={date}
        dateTime={now?.toISOString()}
        aria-label={`Время: ${time}`}
      >
        {time}
      </time>
    </div>
  );
}

function StartMenu({ items, onClose }: { items: StartMenuItem[]; onClose: () => void }) {
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const links = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const index = links.indexOf(document.activeElement as HTMLElement);
    const moveTo = (i: number) => links[(i + links.length) % links.length]?.focus();
    if (event.key === "ArrowDown") moveTo(index + 1);
    else if (event.key === "ArrowUp") moveTo(index - 1);
    else if (event.key === "Home") moveTo(0);
    else if (event.key === "End") moveTo(links.length - 1);
    else if (event.key === "Escape") {
      onClose();
      document.getElementById("start-button")?.focus();
    } else if (event.key === "Tab") onClose();
    else return;
    if (event.key !== "Tab") event.preventDefault();
  };

  return (
    <div className="start-menu" id="start-menu">
      <div className="start-menu__banner" aria-hidden="true">
        <span>
          <b>DevOps</b> Campus
        </span>
      </div>
      <ul
        ref={menuRef}
        className="start-menu__list"
        role="menu"
        aria-label="Пуск"
        onKeyDown={onKeyDown}
      >
        {items.map((item) => (
          <li
            key={item.href ?? item.action}
            role="none"
            className={item.separatorBefore ? "start-menu__item has-separator" : "start-menu__item"}
          >
            {item.action ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onClose();
                  setSystemMode(item.action);
                }}
              >
                <PixelIcon name={item.icon} size={24} />
                <span>{item.label}</span>
              </button>
            ) : item.external ? (
              <a
                role="menuitem"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
              >
                <PixelIcon name={item.icon} size={24} />
                <span>
                  {item.label}
                  <span className="visually-hidden"> (откроется в новой вкладке)</span>
                </span>
              </a>
            ) : (
              <OpenLink role="menuitem" href={item.href} onOpen={onClose}>
                <PixelIcon name={item.icon} size={24} />
                <span>{item.label}</span>
              </OpenLink>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Taskbar({ startItems }: { startItems: StartMenuItem[] }) {
  const wm = useWindowManager();
  const [menuOpen, setMenuOpen] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);
  const activeId = topVisibleId(wm.state);
  const windows = Object.values(wm.state.windows).sort((a, b) => a.seq - b.seq);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!startRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  return (
    <footer className="taskbar">
      <div className="taskbar__start" ref={startRef}>
        <button
          id="start-button"
          type="button"
          className={`start-button ${menuOpen ? "is-pressed" : ""}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? "start-menu" : undefined}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <PixelIcon name="campus" size={18} />
          <span>Пуск</span>
        </button>
        {menuOpen && <StartMenu items={startItems} onClose={() => setMenuOpen(false)} />}
      </div>
      <span className="taskbar__divider" aria-hidden="true" />

      <nav className="taskbar__tasks" aria-label="Открытые окна">
        {windows.map((win) => {
          const isActive = win.id === activeId;
          return (
            <button
              key={win.id}
              id={`task-${windowDomId(win.id)}`}
              type="button"
              className={`task-button ${isActive ? "is-pressed" : ""}`}
              aria-pressed={isActive}
              title={win.title}
              onClick={() => (isActive ? wm.minimize(win.id) : wm.focus(win.id))}
            >
              <PixelIcon name={win.icon} size={16} />
              <span className="task-button__label">{win.title}</span>
            </button>
          );
        })}
      </nav>

      <Clock />
    </footer>
  );
}

/** Ссылка «к открытому окну» для пользователей клавиатуры и скринридеров. */
export function SkipToWindow() {
  const { state, focus } = useWindowManager();
  const top = topVisibleId(state);
  if (!top) return null;
  return (
    <a
      className="skip-link"
      href={`#${windowDomId(top)}`}
      onClick={(event) => {
        event.preventDefault();
        focus(top);
      }}
    >
      Перейти к открытому окну
    </a>
  );
}
