import { ICONS, PALETTE, isIconName, type IconName } from "./icons";

interface Run {
  x: number;
  y: number;
  w: number;
  color: string;
}

const runsCache = new Map<IconName, Run[]>();

/** Склеивает соседние пиксели одного цвета в полосы, чтобы SVG был компактнее. */
function toRuns(name: IconName): Run[] {
  const cached = runsCache.get(name);
  if (cached) return cached;
  const runs: Run[] = [];
  ICONS[name].forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (row[x + w] === ch) w += 1;
      if (ch !== ".") runs.push({ x, y, w, color: PALETTE[ch] });
      x += w;
    }
  });
  runsCache.set(name, runs);
  return runs;
}

export function PixelIcon({
  name,
  size = 32,
  className,
}: {
  name: IconName | string;
  size?: number;
  className?: string;
}) {
  const icon: IconName = isIconName(name) ? name : "folder";
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {toRuns(icon).map((run) => (
        <rect
          key={`${run.x}-${run.y}`}
          x={run.x}
          y={run.y}
          width={run.w}
          height={1}
          fill={run.color}
        />
      ))}
    </svg>
  );
}
