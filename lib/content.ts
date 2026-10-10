// Загрузка материалов из Markdown. Выполняется только на сервере во время `next build`:
// сайт сканирует cohorts/, topics/ и projects/, поэтому новый файл появляется
// на сайте без правки кода.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { extractSummary, renderMarkdown, routeForMarkdownPath } from "./markdown";
import type { Folder, Material, MaterialKind, Section } from "./types";

const ROOT = process.cwd();
const KINDS: MaterialKind[] = ["notes", "slides", "docs", "project"];
const SLUG_RE = /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*$/;

interface ParsedFile {
  filePath: string;
  data: Record<string, unknown>;
  body: string;
}

function walkMarkdown(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.posix.join(dir, file.split(path.sep).join("/")))
    .sort();
}

function subdirs(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

function readFile(filePath: string): ParsedFile {
  const { data, content } = matter(fs.readFileSync(path.join(ROOT, filePath), "utf8"));
  return { filePath, data, body: content };
}

function str(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value).trim();
}

function normalizeDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = str(value);
  if (text && /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text))) return text;
  return undefined;
}

function normalizeCohort(value: unknown): string | undefined {
  const text = str(value);
  if (!text) return undefined;
  return /^\d+$/.test(text) ? text.padStart(2, "0") : text;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
  const text = str(value);
  return text
    ? text
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
}

function readFolder(dir: string, fallbackTitle: string, fallbackIcon: string): Folder {
  const readmePath = `${dir}/README.md`;
  const exists = fs.existsSync(path.join(ROOT, readmePath));
  const parsed = exists ? readFile(readmePath) : { data: {}, body: "", filePath: readmePath };
  return {
    id: dir.split("/").pop() ?? dir,
    href: routeForMarkdownPath(readmePath) ?? "/",
    title: str(parsed.data.title) ?? fallbackTitle,
    icon: str(parsed.data.icon) ?? fallbackIcon,
    summary: str(parsed.data.description) ?? extractSummary(parsed.body),
    descriptionHtml: renderMarkdown(parsed.body, readmePath),
    filePath: readmePath,
  };
}

interface ContentIndex {
  cohorts: Folder[];
  topics: Folder[];
  projectsFolder: Folder;
  materials: Material[];
  bodies: Map<string, ParsedFile>;
}

let cache: ContentIndex | undefined;

function buildIndex(): ContentIndex {
  const cohorts = subdirs("cohorts").map((id) =>
    readFolder(`cohorts/${id}`, `Поток ${id}`, "folder"),
  );
  const topics = subdirs("topics").map((id) => readFolder(`topics/${id}`, id, "folder"));
  const projectsFolder = readFolder("projects", "Проекты", "rocket");
  const topicIds = new Set(topics.map((topic) => topic.id));

  const errors: string[] = [];
  const materials: Material[] = [];
  const bodies = new Map<string, ParsedFile>();

  const files = [
    ...walkMarkdown("cohorts"),
    ...walkMarkdown("topics"),
    ...walkMarkdown("projects"),
  ];

  for (const filePath of files) {
    const [section, ...rest] = filePath.split("/") as [Section, ...string[]];
    const group = section === "projects" ? "" : rest[0];
    const inGroup = section === "projects" ? rest : rest.slice(1);
    // README.md в корне папки потока/темы/проектов — это описание папки, а не материал.
    if (inGroup.length === 0 || inGroup.join("/") === "README.md") continue;
    if (section !== "projects" && rest.length < 2) continue;

    const slug = inGroup
      .join("/")
      .replace(/\.md$/, "")
      .replace(/\/README$/, "");
    const fail = (message: string) => errors.push(`  ${filePath}: ${message}`);

    if (!SLUG_RE.test(slug)) {
      fail("имя файла может содержать только латинские буквы в нижнем регистре, цифры, «-» и «_»");
      continue;
    }

    const parsed = readFile(filePath);
    const { data } = parsed;
    const title = str(data.title);
    const author = str(data.author);
    const date = normalizeDate(data.date);
    const kind = (str(data.kind) ?? (section === "projects" ? "project" : "notes")) as MaterialKind;
    let topic = str(data.topic);
    let cohort = normalizeCohort(data.cohort);

    if (!title) fail("не заполнено поле title");
    if (!author) fail("не заполнено поле author (ник на GitHub)");
    if (!date) fail("поле date должно быть в формате ГГГГ-ММ-ДД");
    if (!KINDS.includes(kind)) fail(`поле kind должно быть одним из: ${KINDS.join(", ")}`);

    if (section === "topics") {
      if (topic && topic !== group) fail(`topic: «${topic}» не совпадает с папкой «${group}»`);
      topic = group;
    } else if (section === "cohorts") {
      if (cohort && cohort !== group) fail(`cohort: «${cohort}» не совпадает с папкой «${group}»`);
      cohort = group;
      if (!topic) fail(`не заполнено поле topic (одно из: ${[...topicIds].join(", ")})`);
    }
    if (topic && !topicIds.has(topic)) {
      fail(`неизвестная тема «${topic}». Доступны: ${[...topicIds].join(", ")}`);
    }
    if (!title || !author || !date) continue;

    const id = filePath.replace(/\.md$/, "").replace(/\/README$/, "");
    materials.push({
      id,
      section,
      group,
      slug,
      href: routeForMarkdownPath(filePath) ?? "/",
      filePath,
      title,
      author,
      date,
      topic,
      cohort,
      tags: normalizeTags(data.tags),
      kind,
      summary: str(data.description) ?? extractSummary(parsed.body),
      repo: str(data.repo),
      demo: str(data.demo),
    });
    bodies.set(id, parsed);
  }

  if (errors.length > 0) {
    throw new Error(
      `Ошибки во frontmatter материалов (шаблон и правила — в CONTRIBUTING.md):\n${errors.join("\n")}`,
    );
  }

  materials.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "ru"));
  return { cohorts, topics, projectsFolder, materials, bodies };
}

function index(): ContentIndex {
  // В dev-режиме перечитываем файлы при каждом запросе, чтобы правки были видны сразу.
  if (process.env.NODE_ENV === "development") return buildIndex();
  cache ??= buildIndex();
  return cache;
}

export const getCohorts = () => index().cohorts;
export const getTopics = () => index().topics;
export const getProjectsFolder = () => index().projectsFolder;
export const getMaterials = () => index().materials;

export const getCohort = (id: string) => getCohorts().find((cohort) => cohort.id === id);
export const getTopic = (id: string) => getTopics().find((topic) => topic.id === id);

export function getMaterialsIn(section: Section, group = "") {
  return getMaterials().filter((m) => m.section === section && m.group === group);
}

/** Материалы темы: файлы из topics/<id>/ и материалы потоков и проектов с этой темой. */
export function getMaterialsForTopic(topicId: string) {
  return getMaterials().filter((m) => m.topic === topicId);
}

export function findMaterial(section: Section, group: string, slugParts: string[]) {
  const slug = slugParts.map(decodeURIComponent).join("/");
  const material = getMaterials().find(
    (m) => m.section === section && m.group === group && m.slug === slug,
  );
  if (!material) return undefined;
  const parsed = index().bodies.get(material.id)!;
  return { material, html: renderMarkdown(parsed.body, parsed.filePath) };
}
