// Логика «Сапёра» без React: поле, ходы и проверка победы.
// Все функции чистые — возвращают новое состояние и не меняют старое.

export type CellState = "hidden" | "open" | "flag";

export interface Cell {
  mine: boolean;
  /** Сколько мин в восьми соседних клетках. */
  adjacent: number;
  state: CellState;
}

export type GameStatus = "ready" | "playing" | "won" | "lost";

export interface Level {
  id: "beginner" | "intermediate" | "expert";
  label: string;
  rows: number;
  cols: number;
  mines: number;
}

export const LEVELS: Level[] = [
  { id: "beginner", label: "Новичок", rows: 9, cols: 9, mines: 10 },
  { id: "intermediate", label: "Любитель", rows: 16, cols: 16, mines: 40 },
  { id: "expert", label: "Профессионал", rows: 16, cols: 30, mines: 99 },
];

export interface Game {
  level: Level;
  cells: Cell[];
  status: GameStatus;
  /** Клетка с миной, на которой подорвались. */
  exploded: number | null;
}

export function newGame(level: Level): Game {
  const cells = Array.from({ length: level.rows * level.cols }, () => ({
    mine: false,
    adjacent: 0,
    state: "hidden" as CellState,
  }));
  return { level, cells, status: "ready", exploded: null };
}

export function neighbors(level: Level, index: number): number[] {
  const row = Math.floor(index / level.cols);
  const col = index % level.cols;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < level.rows && c >= 0 && c < level.cols) result.push(r * level.cols + c);
    }
  }
  return result;
}

/**
 * Мины расставляются после первого хода, в обход выбранной клетки и её соседей:
 * первый ход всегда безопасен и сразу открывает кусок поля.
 */
function placeMines(game: Game, safe: number, random: () => number): Cell[] {
  const { level } = game;
  const forbidden = new Set([safe, ...neighbors(level, safe)]);
  // На маленьком поле может не хватить места: тогда запрещаем только саму клетку.
  if (level.rows * level.cols - forbidden.size < level.mines) forbidden.clear();
  forbidden.add(safe);

  const candidates = game.cells.map((_, i) => i).filter((i) => !forbidden.has(i));
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const mines = new Set(candidates.slice(0, level.mines));
  const cells = game.cells.map((cell, i) => ({ ...cell, mine: mines.has(i) }));
  cells.forEach((cell, i) => {
    cell.adjacent = neighbors(level, i).filter((n) => cells[n].mine).length;
  });
  return cells;
}

function finish(game: Game, cells: Cell[]): Game {
  const closedSafe = cells.some((cell) => !cell.mine && cell.state !== "open");
  if (closedSafe) return { ...game, cells };
  // Победа: оставшиеся мины помечаются флажками, как в оригинале.
  return {
    ...game,
    status: "won",
    cells: cells.map((cell) => (cell.mine ? { ...cell, state: "flag" } : cell)),
  };
}

/** Открывает клетки; пустые клетки раскрывают соседей волной. */
function openCells(game: Game, start: number[]): Game {
  const cells = game.cells.map((cell) => ({ ...cell }));
  const queue = start.filter((i) => cells[i].state === "hidden");
  const hit = queue.find((i) => cells[i].mine);
  if (hit !== undefined) {
    cells.forEach((cell) => {
      if (cell.mine && cell.state === "hidden") cell.state = "open";
    });
    return { ...game, cells, status: "lost", exploded: hit };
  }
  while (queue.length > 0) {
    const i = queue.pop()!;
    if (cells[i].state !== "hidden") continue;
    cells[i].state = "open";
    if (cells[i].adjacent === 0) {
      for (const n of neighbors(game.level, i)) if (cells[n].state === "hidden") queue.push(n);
    }
  }
  return finish(game, cells);
}

export function reveal(game: Game, index: number, random: () => number = Math.random): Game {
  if (game.status === "won" || game.status === "lost") return game;
  const cell = game.cells[index];
  if (cell.state === "flag") return game;
  if (cell.state === "open") return chord(game, index);
  if (game.status === "ready") {
    const started = { ...game, status: "playing" as const, cells: placeMines(game, index, random) };
    return openCells(started, [index]);
  }
  return openCells(game, [index]);
}

/**
 * Клик по открытой цифре: если вокруг уже стоит столько же флажков,
 * открываются все остальные закрытые соседи.
 */
export function chord(game: Game, index: number): Game {
  if (game.status !== "playing") return game;
  const cell = game.cells[index];
  if (cell.state !== "open" || cell.adjacent === 0) return game;
  const around = neighbors(game.level, index);
  const flags = around.filter((n) => game.cells[n].state === "flag").length;
  if (flags !== cell.adjacent) return game;
  return openCells(game, around);
}

export function toggleFlag(game: Game, index: number): Game {
  if (game.status === "won" || game.status === "lost") return game;
  const cell = game.cells[index];
  if (cell.state === "open") return game;
  const cells = [...game.cells];
  cells[index] = { ...cell, state: cell.state === "flag" ? "hidden" : "flag" };
  return { ...game, cells };
}

export function minesLeft(game: Game): number {
  return game.level.mines - game.cells.filter((cell) => cell.state === "flag").length;
}
