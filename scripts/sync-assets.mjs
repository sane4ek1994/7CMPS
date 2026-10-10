// Копирует вложения материалов (картинки, PDF, презентации) из папок с контентом
// в public/files/, чтобы Next.js отдал их как статические файлы.
// Markdown-файлы не копируются: их читает сам сайт при сборке.
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "public", "files");
const contentDirs = ["cohorts", "topics", "projects"];

rmSync(target, { recursive: true, force: true });

let copied = 0;
for (const dir of contentDirs) {
  const source = path.join(root, dir);
  if (!existsSync(source)) continue;
  cpSync(source, path.join(target, dir), {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      if (base.startsWith(".")) return false;
      if (src.endsWith(".md")) return false;
      if (!path.extname(src)) return true; // папка
      copied += 1;
      return true;
    },
  });
}

console.log(`sync-assets: скопировано вложений: ${copied}`);
