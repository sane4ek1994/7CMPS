"use client";

// Оконный менеджер рабочего стола.
//
// Каждое окно соответствует адресу страницы (id окна — путь, например `/topics/docker/`).
// Текущая страница сама рендерит своё окно (так оно попадает в статический HTML),
// а при открытии регистрирует его здесь. Когда пользователь переходит на другую страницу,
// окно предыдущей остаётся открытым: менеджер рендерит его из сохранённого содержимого.

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

export type WindowVariant = "explorer" | "document" | "dialog";

export interface WindowMeta {
  id: string;
  title: string;
  icon: string;
  variant: WindowVariant;
  content: ReactNode;
}

export interface WindowState extends WindowMeta {
  minimized: boolean;
  maximized: boolean;
  pos: { x: number; y: number } | null;
  /** Порядковый номер открытия: задаёт каскад позиций и порядок кнопок на панели задач. */
  seq: number;
}

interface State {
  windows: Record<string, WindowState>;
  /** Порядок по оси Z, последний — сверху. */
  zOrder: string[];
  /** Окно, которое сейчас рендерит страница (а не менеджер). */
  routeId: string | null;
  /** Окно текущей страницы, которое пользователь закрыл: не показывать его снова. */
  suppressed: string | null;
  nextSeq: number;
  focusRequest: { id: string | null; n: number };
}

type Action =
  | { type: "open"; meta: WindowMeta; route: boolean; focus: boolean }
  | { type: "focus"; id: string }
  | { type: "minimize"; id: string }
  | { type: "toggleMaximize"; id: string }
  | { type: "close"; id: string }
  | { type: "move"; id: string; pos: { x: number; y: number } }
  | { type: "releaseRoute"; id: string };

const toFront = (order: string[], id: string) => [...order.filter((x) => x !== id), id];

export function topVisibleId(state: State): string | null {
  for (let i = state.zOrder.length - 1; i >= 0; i -= 1) {
    const win = state.windows[state.zOrder[i]];
    if (win && !win.minimized) return win.id;
  }
  return null;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "open": {
      const { meta } = action;
      const existing = state.windows[meta.id];
      const win: WindowState = existing
        ? { ...existing, ...meta, minimized: false }
        : { ...meta, minimized: false, maximized: false, pos: null, seq: state.nextSeq };
      return {
        ...state,
        windows: { ...state.windows, [meta.id]: win },
        zOrder: toFront(state.zOrder, meta.id),
        nextSeq: existing ? state.nextSeq : state.nextSeq + 1,
        routeId: action.route ? meta.id : state.routeId,
        suppressed: state.suppressed === meta.id ? null : state.suppressed,
        focusRequest: action.focus
          ? { id: meta.id, n: state.focusRequest.n + 1 }
          : state.focusRequest,
      };
    }
    case "focus": {
      const win = state.windows[action.id];
      if (!win) return state;
      return {
        ...state,
        windows: { ...state.windows, [win.id]: { ...win, minimized: false } },
        zOrder: toFront(state.zOrder, win.id),
        focusRequest: { id: win.id, n: state.focusRequest.n + 1 },
      };
    }
    case "minimize": {
      const win = state.windows[action.id];
      if (!win) return state;
      return { ...state, windows: { ...state.windows, [win.id]: { ...win, minimized: true } } };
    }
    case "toggleMaximize": {
      const win = state.windows[action.id];
      if (!win) return state;
      return {
        ...state,
        windows: { ...state.windows, [win.id]: { ...win, maximized: !win.maximized } },
        zOrder: toFront(state.zOrder, win.id),
      };
    }
    case "move": {
      const win = state.windows[action.id];
      if (!win) return state;
      return { ...state, windows: { ...state.windows, [win.id]: { ...win, pos: action.pos } } };
    }
    case "close": {
      const windows = { ...state.windows };
      delete windows[action.id];
      const next: State = {
        ...state,
        windows,
        zOrder: state.zOrder.filter((x) => x !== action.id),
        routeId: state.routeId === action.id ? null : state.routeId,
        suppressed: state.routeId === action.id ? action.id : state.suppressed,
      };
      return { ...next, focusRequest: { id: topVisibleId(next), n: state.focusRequest.n + 1 } };
    }
    case "releaseRoute":
      return state.routeId === action.id ? { ...state, routeId: null } : state;
  }
}

const initialState: State = {
  windows: {},
  zOrder: [],
  routeId: null,
  suppressed: null,
  nextSeq: 0,
  focusRequest: { id: null, n: 0 },
};

interface WindowManagerApi {
  state: State;
  openRouteWindow: (meta: WindowMeta) => void;
  releaseRoute: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  close: (id: string) => void;
  move: (id: string, pos: { x: number; y: number }) => void;
}

const WindowManagerContext = createContext<WindowManagerApi | null>(null);

export function useWindowManager() {
  const api = useContext(WindowManagerContext);
  if (!api) throw new Error("useWindowManager must be used inside <WindowManagerProvider>");
  return api;
}

/** DOM-идентификатор окна по его пути. */
export const windowDomId = (id: string) => `win${id.replace(/[^a-z0-9]+/gi, "-")}`;

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();
  const stateRef = useRef(state);
  const readyRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  });

  // Окно, открытое при загрузке страницы, не забирает фокус. Открытые позже — забирают,
  // чтобы при навигации с клавиатуры пользователь сразу оказывался в новом окне.
  useEffect(() => {
    const timer = setTimeout(() => {
      readyRef.current = true;
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const openRouteWindow = useCallback((meta: WindowMeta) => {
    dispatch({ type: "open", meta, route: true, focus: readyRef.current });
  }, []);
  const releaseRoute = useCallback((id: string) => dispatch({ type: "releaseRoute", id }), []);
  const focus = useCallback((id: string) => dispatch({ type: "focus", id }), []);
  const toggleMaximize = useCallback((id: string) => dispatch({ type: "toggleMaximize", id }), []);
  const move = useCallback(
    (id: string, pos: { x: number; y: number }) => dispatch({ type: "move", id, pos }),
    [],
  );

  const minimize = useCallback((id: string) => {
    dispatch({ type: "minimize", id });
    // Кнопка «Свернуть» исчезает вместе с окном, поэтому фокус уходит на панель задач.
    requestAnimationFrame(() => document.getElementById(`task-${windowDomId(id)}`)?.focus());
  }, []);

  const close = useCallback(
    (id: string) => {
      const wasRoute = stateRef.current.routeId === id;
      dispatch({ type: "close", id });
      // Закрыли окно текущей страницы: адрес возвращается на рабочий стол,
      // чтобы обновление страницы не открыло окно снова.
      if (wasRoute) router.replace("/", { scroll: false });
    },
    [router],
  );

  // Перенос фокуса в окно по запросу (открытие, переключение с панели задач, закрытие соседнего).
  useEffect(() => {
    const { id } = state.focusRequest;
    if (state.focusRequest.n === 0) return;
    requestAnimationFrame(() => {
      const target = id
        ? document.getElementById(windowDomId(id))
        : document.getElementById("start-button");
      target?.focus({ preventScroll: true });
    });
  }, [state.focusRequest]);

  const api = useMemo(
    () => ({
      state,
      openRouteWindow,
      releaseRoute,
      focus,
      minimize,
      toggleMaximize,
      close,
      move,
    }),
    [state, openRouteWindow, releaseRoute, focus, minimize, toggleMaximize, close, move],
  );

  return <WindowManagerContext.Provider value={api}>{children}</WindowManagerContext.Provider>;
}
