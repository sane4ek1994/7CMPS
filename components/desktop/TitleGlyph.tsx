// Пиксельные глифы кнопок заголовка окна. Рисуются один к одному (1 пиксель SVG —
// 1 пиксель экрана), поэтому остаются чёткими, как в системах конца 90-х.

const GLYPHS = {
  minimize: ["........", "........", "........", "........", "........", ".######.", ".######."],
  maximize: [
    "#########",
    "#########",
    "#.......#",
    "#.......#",
    "#.......#",
    "#.......#",
    "#.......#",
    "#########",
  ],
  restore: [
    "..######",
    "..######",
    "..#....#",
    "######.#",
    "######.#",
    "#....###",
    "#....#..",
    "######..",
  ],
  close: ["##....##", ".##..##.", "..####..", "...##...", "..####..", ".##..##.", "##....##"],
} as const;

export type GlyphName = keyof typeof GLYPHS;

export function TitleGlyph({ name }: { name: GlyphName }) {
  const rows = GLYPHS[name];
  const width = rows[0].length;
  const height = rows.length;
  const path = rows
    .flatMap((row, y) =>
      [...row].map((cell, x) => (cell === "#" ? `M${x} ${y}h1v1h-1z` : "")).filter(Boolean),
    )
    .join("");
  return (
    <svg
      className="title-glyph"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
