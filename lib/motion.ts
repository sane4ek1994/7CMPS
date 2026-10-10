// Анимации рабочего стола в духе систем конца 90-х: при открытии, сворачивании
// и разворачивании окна по экрану «пролетает» его заголовок. Все функции — только
// для браузера и ничего не делают, если пользователь попросил уменьшить движение.

/** Длительность полёта заголовка, мс. */
export const ZOOM_MS = 220;
/** Высота «летящего» заголовка, как у настоящей полосы заголовка окна. */
const CAPTION_H = 22;

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Прямоугольник полосы заголовка: верх окна или кнопки целиком. */
export function captionRect(el: Element | null): DOMRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return new DOMRect(r.x, r.y, r.width, Math.min(r.height, CAPTION_H + 4));
}

/**
 * Проводит заголовок окна из одного прямоугольника в другой. Возвращает длительность
 * анимации (0, если её не было), чтобы окно могло показаться после неё.
 */
export function zoomCaption(from: DOMRect | null, to: DOMRect | null, label = ""): number {
  // В фоновой вкладке анимации стоят на месте, и окно осталось бы невидимым.
  if (!from || !to || document.hidden || prefersReducedMotion()) return 0;
  const bar = document.createElement("div");
  bar.className = "zoom-caption";
  bar.setAttribute("aria-hidden", "true");
  bar.textContent = label;
  document.body.append(bar);
  const frame = (r: DOMRect) => ({
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${Math.min(r.height, CAPTION_H)}px`,
  });
  // Ступенчатое движение: у старых систем анимация шла рывками по кадрам.
  const animation = bar.animate([frame(from), frame(to)], {
    duration: ZOOM_MS,
    easing: "steps(8, jump-end)",
    fill: "forwards",
  });
  const remove = () => bar.remove();
  animation.onfinish = remove;
  animation.oncancel = remove;
  setTimeout(remove, ZOOM_MS + 200);
  return ZOOM_MS;
}

/** Прячет окно, пока к нему летит заголовок. */
export function hideDuring(el: HTMLElement | null, ms: number) {
  if (el && ms > 0) el.animate({ opacity: [0, 0] }, { duration: ms });
}

// Откуда открывается окно: ссылка запоминает свой прямоугольник, а новое окно
// после загрузки страницы забирает его и «вылетает» из этого места.
let origin: { href: string; rect: DOMRect; at: number } | null = null;

export function rememberOrigin(href: string, el: Element) {
  const rect = el.getBoundingClientRect();
  origin = rect.width > 0 ? { href, rect, at: Date.now() } : null;
}

export function takeOrigin(href: string): DOMRect | null {
  const found = origin && origin.href === href && Date.now() - origin.at < 10_000 ? origin : null;
  origin = null;
  return found?.rect ?? null;
}

// Курсор «песочные часы», пока загружается страница нового окна.
let busyTimer: ReturnType<typeof setTimeout> | undefined;

export function setBusy(busy: boolean) {
  clearTimeout(busyTimer);
  document.documentElement.classList.toggle("is-busy", busy);
  // Страховка: если окно так и не открылось (ошибка сети), курсор вернётся сам.
  if (busy) busyTimer = setTimeout(() => setBusy(false), 10_000);
}
