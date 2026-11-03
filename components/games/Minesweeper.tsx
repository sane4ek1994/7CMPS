"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import {
  LEVELS,
  minesLeft,
  newGame,
  reveal,
  toggleFlag,
  type Cell,
  type Game,
  type Level,
} from "@/lib/minesweeper";
import { sounds } from "@/lib/sound";

const LEVEL_KEY = "campus-minesweeper-level";
const BEST_KEY = "campus-minesweeper-best";
const LONG_PRESS_MS = 400;

type Action =
  | { type: "reveal"; index: number; seed: number }
  | { type: "flag"; index: number }
  | { type: "new"; level: Level };

/** Детерминированный генератор: случайность приходит в действии, и редьюсер остаётся чистым. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function reducer(game: Game, action: Action): Game {
  switch (action.type) {
    case "reveal":
      return reveal(game, action.index, mulberry32(action.seed));
    case "flag":
      return toggleFlag(game, action.index);
    case "new":
      return newGame(action.level);
  }
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Хранилище недоступно: уровень и рекорды продержатся до перезагрузки.
  }
}

// ---------------------------------------------------------------- Табло

const SEGMENTS = {
  a: [2, 0, 8, 2],
  b: [10, 2, 2, 8],
  c: [10, 12, 2, 8],
  d: [2, 20, 8, 2],
  e: [0, 12, 2, 8],
  f: [0, 2, 2, 8],
  g: [2, 10, 8, 2],
} as const;

const DIGITS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  "-": "g",
};

/** Трёхзначное табло из семисегментных цифр, как на старых электронных часах. */
function Led({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(-99, Math.min(999, value));
  const text =
    clamped < 0 ? `-${String(-clamped).padStart(2, "0")}` : String(clamped).padStart(3, "0");
  return (
    <svg
      className="led"
      role="img"
      aria-label={label}
      viewBox="-2 -2 44 26"
      width="52"
      height="31"
      shapeRendering="crispEdges"
    >
      <rect x="-2" y="-2" width="44" height="26" fill="#000" />
      {[...text].map((ch, i) =>
        (Object.keys(SEGMENTS) as (keyof typeof SEGMENTS)[]).map((seg) => {
          const [x, y, w, h] = SEGMENTS[seg];
          const on = DIGITS[ch]?.includes(seg);
          return (
            <rect
              key={`${i}${seg}`}
              x={i * 14 + x}
              y={y}
              width={w}
              height={h}
              className={on ? "led__on" : "led__off"}
            />
          );
        }),
      )}
    </svg>
  );
}

// ---------------------------------------------------------------- Меню «Игра»

function GameMenu({
  level,
  flagMode,
  onNew,
  onLevel,
  onFlagMode,
}: {
  level: Level;
  flagMode: boolean;
  onNew: () => void;
  onLevel: (level: Level) => void;
  onFlagMode: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>("[role^=menuitem]")?.focus();
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) rootRef.current?.querySelector<HTMLElement>(".menubar__button")?.focus();
  };

  const pick = (fn: () => void) => {
    fn();
    close(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>("[role^=menuitem]") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const moveTo = (i: number) => items[(i + items.length) % items.length]?.focus();
    if (event.key === "ArrowDown") moveTo(index + 1);
    else if (event.key === "ArrowUp") moveTo(index - 1);
    else if (event.key === "Home") moveTo(0);
    else if (event.key === "End") moveTo(items.length - 1);
    else if (event.key === "Escape") close(true);
    else if (event.key === "Tab") return setOpen(false);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="menubar" ref={rootRef}>
      <button
        type="button"
        className={`menubar__button ${open ? "is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <u>И</u>гра
      </button>
      {open && (
        <ul
          className="menubar__menu"
          role="menu"
          aria-label="Игра"
          ref={listRef}
          onKeyDown={onKeyDown}
        >
          <li role="none">
            <button type="button" role="menuitem" onClick={() => pick(onNew)}>
              <span className="menubar__check" aria-hidden="true" />
              Новая игра
              <kbd>F2</kbd>
            </button>
          </li>
          <li role="separator" />
          {LEVELS.map((item) => (
            <li role="none" key={item.id}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={item.id === level.id}
                onClick={() => pick(() => onLevel(item))}
              >
                <span className="menubar__check" aria-hidden="true">
                  {item.id === level.id ? "•" : ""}
                </span>
                {item.label}
                <span className="menubar__hint">
                  {item.cols}×{item.rows}, {item.mines}
                </span>
              </button>
            </li>
          ))}
          <li role="separator" />
          <li role="none">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={flagMode}
              onClick={() => pick(() => onFlagMode(!flagMode))}
            >
              <span className="menubar__check" aria-hidden="true">
                {flagMode ? "✓" : ""}
              </span>
              Касание ставит флажок
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Клетка

function describe(cell: Cell, game: Game, index: number): string {
  const lost = game.status === "lost";
  if (cell.state === "flag") return lost && !cell.mine ? "флажок, мины не было" : "флажок";
  if (cell.state === "hidden") return "закрыта";
  if (cell.mine) return index === game.exploded ? "мина, подрыв" : "мина";
  return cell.adjacent === 0 ? "пусто" : `мин рядом: ${cell.adjacent}`;
}

function CellContent({ cell, game }: { cell: Cell; game: Game }) {
  const lost = game.status === "lost";
  if (cell.state === "flag") {
    return lost && !cell.mine ? (
      <span className="mine-cell__wrong">
        <PixelIcon name="mine" size={18} />
      </span>
    ) : (
      <PixelIcon name="flag" size={18} />
    );
  }
  if (cell.state === "hidden") return null;
  if (cell.mine) return <PixelIcon name="mine" size={18} />;
  return cell.adjacent > 0 ? <span>{cell.adjacent}</span> : null;
}

// ---------------------------------------------------------------- Игра

export function Minesweeper() {
  const [game, dispatch] = useReducer(reducer, LEVELS[0], newGame);
  const [flagMode, setFlagMode] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [focused, setFocused] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [best, setBest] = useState<Partial<Record<Level["id"], number>>>({});
  const [announcement, setAnnouncement] = useState("");
  const startRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const longPress = useRef<{
    timer?: ReturnType<typeof setTimeout>;
    fired: boolean;
    touch: boolean;
  }>({ fired: false, touch: false });
  const { level } = game;

  // Уровень и рекорды хранятся в браузере зрителя; читаем после монтирования.
  useEffect(() => {
    const savedId = readStorage<string>(LEVEL_KEY, LEVELS[0].id);
    const saved = LEVELS.find((item) => item.id === savedId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- данные из localStorage доступны только в браузере
    setBest(readStorage(BEST_KEY, {}));
    if (saved && saved.id !== LEVELS[0].id) dispatch({ type: "new", level: saved });
  }, []);

  // Секундомер: идёт с первого хода до конца партии.
  useEffect(() => {
    if (game.status !== "playing") return;
    startRef.current ??= Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - startRef.current!) / 1000) + 1);
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [game.status]);

  const prevStatus = useRef(game.status);
  useEffect(() => {
    const before = prevStatus.current;
    prevStatus.current = game.status;
    if (before === game.status) return;
    if (game.status === "lost") {
      sounds.boom();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- объявление для скринридера при смене статуса
      setAnnouncement(
        "Подрыв на мине. Игра окончена. Нажмите F2 или смайлик, чтобы начать заново.",
      );
    } else if (game.status === "won") {
      sounds.win();
      const seconds = Math.min(
        999,
        Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000) + 1,
      );
      setElapsed(seconds);
      const record = best[level.id];
      const isRecord = record === undefined || seconds < record;
      if (isRecord) {
        const next = { ...best, [level.id]: seconds };
        setBest(next);
        writeStorage(BEST_KEY, next);
      }
      setAnnouncement(`Поле разминировано за ${seconds} с.${isRecord ? " Новый рекорд!" : ""}`);
    }
  }, [game.status, best, level.id]);

  const start = useCallback(
    (next: Level = level) => {
      startRef.current = null;
      setElapsed(0);
      setAnnouncement("");
      dispatch({ type: "new", level: next });
    },
    [level],
  );

  const changeLevel = (next: Level) => {
    writeStorage(LEVEL_KEY, next.id);
    setFocused(0);
    start(next);
  };

  const open = (index: number) => {
    const cell = game.cells[index];
    if (game.status === "won" || game.status === "lost" || cell.state === "flag") return;
    if (cell.state === "open" && cell.adjacent === 0) return;
    sounds.click();
    dispatch({ type: "reveal", index, seed: Math.floor(Math.random() * 2 ** 32) });
  };

  const flag = (index: number) => {
    if (game.status === "won" || game.status === "lost") return;
    if (game.cells[index].state === "open") return;
    sounds.click();
    dispatch({ type: "flag", index });
  };

  const activate = (index: number) => {
    const cell = game.cells[index];
    if (flagMode && cell.state !== "open") flag(index);
    else open(index);
  };

  const focusCell = (index: number) => {
    setFocused(index);
    boardRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus();
  };

  const onCellKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const row = Math.floor(index / level.cols);
    const col = index % level.cols;
    let next: number | null = null;
    if (event.key === "ArrowUp") next = row > 0 ? index - level.cols : null;
    else if (event.key === "ArrowDown") next = row < level.rows - 1 ? index + level.cols : null;
    else if (event.key === "ArrowLeft") next = col > 0 ? index - 1 : null;
    else if (event.key === "ArrowRight") next = col < level.cols - 1 ? index + 1 : null;
    else if (event.key === "Home") next = row * level.cols;
    else if (event.key === "End") next = row * level.cols + level.cols - 1;
    else if (event.code === "KeyF") {
      event.preventDefault();
      flag(index);
      return;
    } else return;
    event.preventDefault();
    if (next !== null) focusCell(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    longPress.current.touch = event.pointerType !== "mouse";
    longPress.current.fired = false;
    if (event.button === 0 && game.status !== "won" && game.status !== "lost") setPressing(true);
    if (event.pointerType === "mouse") return;
    clearTimeout(longPress.current.timer);
    longPress.current.timer = setTimeout(() => {
      longPress.current.fired = true;
      setPressing(false);
      if (flagMode) open(index);
      else flag(index);
    }, LONG_PRESS_MS);
  };

  const endPress = () => {
    clearTimeout(longPress.current.timer);
    setPressing(false);
  };

  const face =
    game.status === "lost"
      ? "faceDead"
      : game.status === "won"
        ? "faceCool"
        : pressing
          ? "faceWow"
          : "faceSmile";
  const faceLabel =
    game.status === "lost"
      ? "Новая игра (вы подорвались)"
      : game.status === "won"
        ? "Новая игра (победа)"
        : "Новая игра";

  const record = best[level.id];

  return (
    <div
      className="mines"
      onKeyDown={(event) => {
        if (event.key === "F2") {
          event.preventDefault();
          start();
        }
      }}
    >
      <GameMenu
        level={level}
        flagMode={flagMode}
        onNew={() => start()}
        onLevel={changeLevel}
        onFlagMode={setFlagMode}
      />

      <div className="mines__frame">
        <div className="mines__head">
          <Led value={minesLeft(game)} label={`Мин осталось: ${minesLeft(game)}`} />
          <div className="mines__buttons">
            <button
              type="button"
              className="mines__face"
              aria-label={faceLabel}
              onClick={() => start()}
            >
              <PixelIcon name={face} size={26} />
            </button>
            <button
              type="button"
              className="mines__flag-mode"
              aria-pressed={flagMode}
              aria-label="Касание ставит флажок"
              title="Касание ставит флажок"
              onClick={() => setFlagMode((v) => !v)}
            >
              <PixelIcon name="flag" size={20} />
            </button>
          </div>
          <Led value={elapsed} label={`Время: ${elapsed} с`} />
        </div>

        <div className="mines__scroll">
          <div
            ref={boardRef}
            className={`mines__board ${game.status === "lost" ? "is-lost" : ""}`}
            role="grid"
            aria-label={`Минное поле ${level.cols} на ${level.rows}, мин: ${level.mines}`}
            aria-rowcount={level.rows}
            aria-colcount={level.cols}
            style={{ "--cols": level.cols } as React.CSSProperties}
            onContextMenu={(event) => event.preventDefault()}
          >
            {Array.from({ length: level.rows }, (_, row) => (
              <div role="row" key={row} className="mines__row" aria-rowindex={row + 1}>
                {Array.from({ length: level.cols }, (_, col) => {
                  const index = row * level.cols + col;
                  const cell = game.cells[index];
                  const isOpen = cell.state === "open";
                  return (
                    <div
                      role="gridcell"
                      key={col}
                      aria-colindex={col + 1}
                      className="mines__gridcell"
                    >
                      <button
                        type="button"
                        data-index={index}
                        tabIndex={index === focused ? 0 : -1}
                        className={[
                          "mine-cell",
                          isOpen ? "is-open" : "",
                          isOpen && !cell.mine && cell.adjacent ? `n${cell.adjacent}` : "",
                          index === game.exploded ? "is-exploded" : "",
                        ].join(" ")}
                        aria-label={`Строка ${row + 1}, столбец ${col + 1}: ${describe(cell, game, index)}`}
                        onFocus={() => setFocused(index)}
                        onKeyDown={(event) => onCellKeyDown(event, index)}
                        onPointerDown={(event) => onPointerDown(event, index)}
                        onPointerUp={endPress}
                        onPointerLeave={endPress}
                        onPointerCancel={endPress}
                        onClick={() => {
                          if (longPress.current.fired) {
                            longPress.current.fired = false;
                            return;
                          }
                          // Клик по открытой цифре открывает соседей (аккорд): это делает reveal.
                          activate(index);
                        }}
                        onAuxClick={(event) => {
                          // Средняя кнопка мыши — классический аккорд.
                          if (event.button === 1 && isOpen) {
                            event.preventDefault();
                            open(index);
                          }
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          // На телефоне долгое нажатие уже обработано своим таймером.
                          if (!longPress.current.touch) flag(index);
                        }}
                      >
                        <CellContent cell={cell} game={game} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="statusbar">
        <span>
          {level.label}: {level.cols}×{level.rows}, мин {level.mines}
        </span>
        <span>Рекорд: {record !== undefined ? `${record} с` : "—"}</span>
      </div>
      <p className="mines__help">
        Клик открывает клетку, правый клик или долгое нажатие ставит флажок. Клик по цифре открывает
        соседей, когда вокруг уже стоит нужное число флажков. С клавиатуры: стрелки, Enter, F —
        флажок, F2 — новая игра.
      </p>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
