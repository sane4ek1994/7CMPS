// Пиксельный шрифт 5×7 для надписи на рабочем столе. Нарисован для проекта,
// содержит только нужные символы.

const GLYPHS: Record<string, string[]> = {
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  К: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  А: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  М: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  П: ["#####", "#...#", "#...#", "#...#", "#...#", "#...#", "#...#"],
  У: ["#...#", "#...#", "#...#", ".####", "....#", "....#", "####."],
  С: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

export function PixelText({
  text,
  pixel = 4,
  color = "#ffffff",
  shadow = "#004040",
  className,
}: {
  text: string;
  pixel?: number;
  color?: string;
  shadow?: string;
  className?: string;
}) {
  const chars = [...text.toUpperCase()].filter((ch) => GLYPHS[ch]);
  const width = chars.length * 6 - 1;
  const cells: { x: number; y: number }[] = [];
  chars.forEach((ch, i) => {
    GLYPHS[ch].forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === "#") cells.push({ x: i * 6 + x, y });
      });
    });
  });
  return (
    <svg
      className={className}
      role="img"
      aria-label={text}
      width={(width + 1) * pixel}
      height={8 * pixel}
      viewBox={`0 0 ${width + 1} 8`}
      shapeRendering="crispEdges"
    >
      {cells.map(({ x, y }) => (
        <rect key={`s${x}-${y}`} x={x + 1} y={y + 1} width={1} height={1} fill={shadow} />
      ))}
      {cells.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}
