"use client";

import Link from "next/link";
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { TitleGlyph } from "./TitleGlyph";
import { topVisibleId, useWindowManager, windowDomId, type WindowVariant } from "./WindowManager";

const MOBILE_QUERY = "(max-width: 700px)";

interface WindowProps {
  id: string;
  title: string;
  icon: string;
  variant?: WindowVariant;
  children: ReactNode;
  /** true — окно рендерит менеджер из сохранённого содержимого, а не текущая страница. */
  cached?: boolean;
}

/** Каскад: каждое новое окно чуть ниже и правее предыдущего. */
function cascade(seq: number) {
  const step = seq % 7;
  return { x: 128 + step * 30, y: 16 + step * 26 };
}

export function Window({ id, title, icon, variant = "explorer", children, cached }: WindowProps) {
  const wm = useWindowManager();
  const { openRouteWindow, releaseRoute } = wm;
  const state = wm.state.windows[id];
  const sectionRef = useRef<HTMLElement>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // Окно текущей страницы регистрирует себя до отрисовки кадра,
  // чтобы менеджер сразу знал его позицию и порядок.
  useLayoutEffect(() => {
    if (cached) return;
    openRouteWindow({ id, title, icon, variant, content: children });
    return () => releaseRoute(id);
    // Содержимое страницы статично: перерегистрация нужна только при смене окна.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, cached, openRouteWindow, releaseRoute]);

  if (!cached && wm.state.suppressed === id) return null;

  const domId = windowDomId(id);
  const titleId = `${domId}-title`;
  const zIndex = 10 + (state ? wm.state.zOrder.indexOf(id) : wm.state.zOrder.length);
  const active = state ? topVisibleId(wm.state) === id : true;
  const pos = dragPos ?? state?.pos ?? cascade(state?.seq ?? wm.state.nextSeq);
  const maximized = state?.maximized ?? false;

  const onPointerDownWindow = () => {
    if (state && !active) wm.focus(id);
  };

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || maximized) return;
    if ((event.target as HTMLElement).closest("button, a")) return;
    if (window.matchMedia(MOBILE_QUERY).matches) return;
    const el = sectionRef.current;
    if (!el) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { px: event.clientX, py: event.clientY, x: el.offsetLeft, y: el.offsetTop };
  };

  const onDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const parent = sectionRef.current?.offsetParent as HTMLElement | null;
    const maxX = (parent?.clientWidth ?? window.innerWidth) - 80;
    const maxY = (parent?.clientHeight ?? window.innerHeight) - 30;
    setDragPos({
      x: Math.min(Math.max(drag.x + event.clientX - drag.px, -200), maxX),
      y: Math.min(Math.max(drag.y + event.clientY - drag.py, 0), maxY),
    });
  };

  const endDrag = () => {
    if (dragRef.current && dragPos) wm.move(id, dragPos);
    dragRef.current = null;
    setDragPos(null);
  };

  const onTitleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    if (!window.matchMedia(MOBILE_QUERY).matches) wm.toggleMaximize(id);
  };

  const style = {
    "--x": `${pos.x}px`,
    "--y": `${pos.y}px`,
    zIndex,
  } as CSSProperties;

  return (
    <section
      ref={sectionRef}
      id={domId}
      className={[
        "window",
        `window--${variant}`,
        active ? "is-active" : "",
        maximized ? "is-maximized" : "",
        dragPos ? "is-dragging" : "",
      ].join(" ")}
      style={style}
      hidden={state?.minimized}
      aria-labelledby={titleId}
      tabIndex={-1}
      onPointerDown={onPointerDownWindow}
    >
      <header
        className="window__titlebar"
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onTitleDoubleClick}
      >
        <PixelIcon name={icon} size={16} className="window__icon" />
        <h2 id={titleId} className="window__title">
          {title}
        </h2>
        <div className="window__controls">
          <button
            type="button"
            className="title-button"
            aria-label={`Свернуть окно «${title}»`}
            title="Свернуть"
            onClick={() => wm.minimize(id)}
            disabled={!state}
          >
            <span className="title-button__face">
              <TitleGlyph name="minimize" />
            </span>
          </button>
          <button
            type="button"
            className="title-button title-button--max"
            aria-label={maximized ? `Восстановить окно «${title}»` : `Развернуть окно «${title}»`}
            title={maximized ? "Восстановить" : "Развернуть"}
            onClick={() => wm.toggleMaximize(id)}
            disabled={!state}
          >
            <span className="title-button__face">
              <TitleGlyph name={maximized ? "restore" : "maximize"} />
            </span>
          </button>
          <button
            type="button"
            className="title-button title-button--close"
            aria-label={`Закрыть окно «${title}»`}
            title="Закрыть"
            onClick={() => wm.close(id)}
            disabled={!state}
          >
            <span className="title-button__face">
              <TitleGlyph name="close" />
            </span>
          </button>
        </div>
      </header>
      <div className="window__body">{children}</div>
    </section>
  );
}

/** Окна, открытые раньше, которые уже не принадлежат текущей странице. */
export function CachedWindows() {
  const { state } = useWindowManager();
  return (
    <>
      {Object.values(state.windows)
        .filter((win) => win.id !== state.routeId)
        .map((win) => (
          <Window
            key={win.id}
            id={win.id}
            title={win.title}
            icon={win.icon}
            variant={win.variant}
            cached
          >
            {win.content}
          </Window>
        ))}
    </>
  );
}

/**
 * Ссылка, открывающая окно. Если окно уже открыто, переключается на него
 * вместо повторной загрузки страницы.
 */
export function OpenLink({
  href,
  className,
  children,
  onOpen,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onOpen?: () => void;
  role?: string;
  "aria-label"?: string;
}) {
  const wm = useWindowManager();
  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        onOpen?.();
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        if (wm.state.windows[href]) {
          event.preventDefault();
          wm.focus(href);
        }
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
