import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import { common } from "lowlight";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import nginx from "highlight.js/lib/languages/nginx";
import { visit } from "unist-util-visit";
import type { Element, Root } from "hast";
import { githubFileUrl } from "@/site.config";

const CONTENT_DIRS = ["cohorts", "topics", "projects"];

/** `cohorts/07/linux.md` -> `/cohorts/07/linux/`. Для файлов вне контента возвращает null. */
export function routeForMarkdownPath(repoPath: string): string | null {
  const [section, ...rest] = repoPath.split("/");
  if (!CONTENT_DIRS.includes(section)) return null;
  let tail = rest.join("/").replace(/\.md$/, "");
  tail = tail.replace(/(^|\/)README$/, "");
  return `/${[section, tail].filter(Boolean).join("/")}/`;
}

function isExternal(url: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");
}

/**
 * Переписывает относительные ссылки так, чтобы они работали и на GitHub, и на сайте:
 * `.md` ведёт на страницу материала, вложения на /files/..., остальное на GitHub.
 */
function rehypeRepoLinks(options: { filePath: string }) {
  const baseDir = path.posix.dirname(options.filePath);

  const resolve = (url: string) => {
    if (!url || url.startsWith("#") || url.startsWith("/") || isExternal(url)) return url;
    const [pathname, hash = ""] = url.split("#");
    const repoPath = path.posix.normalize(path.posix.join(baseDir, decodeURI(pathname)));
    const suffix = hash ? `#${hash}` : "";
    if (repoPath.endsWith(".md")) {
      const route = routeForMarkdownPath(repoPath);
      return route ? route + suffix : githubFileUrl(repoPath) + suffix;
    }
    if (CONTENT_DIRS.includes(repoPath.split("/")[0])) return `/files/${encodeURI(repoPath)}`;
    return githubFileUrl(repoPath);
  };

  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName === "a" && typeof node.properties.href === "string") {
        node.properties.href = resolve(node.properties.href);
        if (isExternal(node.properties.href)) {
          node.properties.target = "_blank";
          node.properties.rel = ["noopener", "noreferrer"];
        }
      }
      if (node.tagName === "img" && typeof node.properties.src === "string") {
        node.properties.src = resolve(node.properties.src);
        node.properties.loading = "lazy";
      }
      // Заголовок окна — h2, поэтому заголовки текста сдвигаются на уровень ниже: `##` -> h3.
      const level = /^h([1-6])$/.exec(node.tagName);
      if (level) node.tagName = `h${Math.min(Number(level[1]) + 1, 6)}`;
      // Широкие таблицы прокручиваются внутри окна, а не растягивают его.
      if (node.tagName === "table" && parent && typeof index === "number") {
        parent.children[index] = {
          type: "element",
          tagName: "div",
          properties: { className: ["table-wrap"], tabIndex: 0 },
          children: [node],
        };
      }
    });
  };
}

/**
 * Markdown -> HTML. Сырой HTML внутри Markdown не пропускается (нет allowDangerousHtml),
 * поэтому результат безопасно вставлять через dangerouslySetInnerHTML.
 */
export function renderMarkdown(markdown: string, filePath: string): string {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeRepoLinks, { filePath })
      .use(rehypeHighlight, {
        languages: { ...common, dockerfile, nginx },
        aliases: { ini: ["toml", "hcl", "terraform", "tf"], bash: ["sh", "console"] },
        detect: false,
      })
      .use(rehypeStringify)
      .processSync(markdown),
  );
}

/** Первый абзац текста без разметки, для списков и мета-описаний. */
export function extractSummary(markdown: string, max = 180): string {
  const paragraph =
    markdown
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find((block) => block && !/^(#|```|[-*+] |\d+\. |>|\||!\[|<)/.test(block)) ?? "";
  const text = paragraph
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
