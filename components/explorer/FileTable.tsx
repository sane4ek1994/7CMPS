import { OpenLink } from "@/components/desktop/Window";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { formatDate } from "@/lib/format";
import { KIND_LABELS, type Material } from "@/lib/types";

/** Список материалов в виде «таблицы» проводника. */
export function FileTable({
  materials,
  caption,
  context = "topic",
}: {
  materials: Material[];
  caption: string;
  /** Что показывать в третьей колонке: тему или поток. */
  context?: "topic" | "cohort";
}) {
  if (materials.length === 0) {
    return (
      <p className="empty-state">
        Здесь пока пусто. Добавьте первый материал через pull request: инструкция в CONTRIBUTING.md.
      </p>
    );
  }
  return (
    <table className="file-table">
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Имя</th>
          <th scope="col">Тип</th>
          <th scope="col">Автор</th>
          <th scope="col">{context === "topic" ? "Тема" : "Поток"}</th>
          <th scope="col">Дата</th>
        </tr>
      </thead>
      <tbody>
        {materials.map((m) => (
          <tr key={m.id}>
            <td>
              <OpenLink href={m.href} className="file-name">
                <PixelIcon name={m.kind === "project" ? "rocket" : m.kind} size={16} />
                <span>
                  <span className="file-name__title">{m.title}</span>
                  {m.summary && <span className="file-name__summary">{m.summary}</span>}
                </span>
              </OpenLink>
            </td>
            <td className="col-meta nowrap">{KIND_LABELS[m.kind]}</td>
            <td className="col-meta">{m.author}</td>
            {(() => {
              const value =
                context === "topic" ? m.topic : m.cohort ? `поток ${m.cohort}` : undefined;
              return (
                <td className={value ? "col-meta nowrap" : "col-meta nowrap is-empty"}>
                  {value ?? "—"}
                </td>
              );
            })()}
            <td className="col-meta nowrap">
              <time dateTime={m.date}>{formatDate(m.date)}</time>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
