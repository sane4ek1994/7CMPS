// Типы контента. Файл без серверных зависимостей: его импортируют и клиентские компоненты.

export type Section = "cohorts" | "topics" | "projects";

/** Тип материала определяет иконку файла в проводнике. */
export type MaterialKind = "notes" | "slides" | "docs" | "project";

export interface Material {
  /** Путь без расширения, например `cohorts/07/linux-navigation`. Ключ обсуждения в giscus. */
  id: string;
  section: Section;
  /** Номер потока для `cohorts`, ключ темы для `topics`, пусто для `projects`. */
  group: string;
  slug: string;
  href: string;
  /** Путь к исходному файлу в репозитории. */
  filePath: string;
  title: string;
  author: string;
  date: string;
  topic?: string;
  cohort?: string;
  tags: string[];
  kind: MaterialKind;
  summary: string;
  repo?: string;
  demo?: string;
}

export interface Folder {
  id: string;
  href: string;
  title: string;
  icon: string;
  summary: string;
  /** HTML из README.md папки. */
  descriptionHtml: string;
  filePath: string;
}

export const KIND_LABELS: Record<MaterialKind, string> = {
  notes: "Конспект",
  slides: "Презентация",
  docs: "Документация",
  project: "Проект",
};
