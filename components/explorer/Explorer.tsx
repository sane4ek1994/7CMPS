import type { ReactNode } from "react";
import { OpenLink } from "@/components/desktop/Window";
import { PixelIcon } from "@/components/pixel/PixelIcon";

interface ExplorerProps {
  /** Путь в стиле адресной строки, например `cohorts/07`. */
  address: string;
  upHref?: string;
  githubHref?: string;
  icon: string;
  title: string;
  /** Описание папки: HTML из README.md или обычный текст. */
  descriptionHtml?: string;
  description?: ReactNode;
  status: string;
  children: ReactNode;
}

/** Окно проводника: адресная строка, панель с описанием папки и список файлов. */
export function Explorer({
  address,
  upHref,
  githubHref,
  icon,
  title,
  descriptionHtml,
  description,
  status,
  children,
}: ExplorerProps) {
  return (
    <>
      <div className="toolbar">
        {upHref && (
          <OpenLink href={upHref} className="btn" aria-label="Вверх, в родительскую папку">
            <span aria-hidden="true">↑</span> Вверх
          </OpenLink>
        )}
        {githubHref && (
          <a className="btn" href={githubHref} target="_blank" rel="noopener noreferrer">
            Папка на GitHub
            <span className="visually-hidden"> (откроется в новой вкладке)</span>
          </a>
        )}
      </div>
      <div className="address">
        <span aria-hidden="true">Адрес</span>
        <span className="address__field" aria-label={`Адрес: ${address}`}>
          <PixelIcon name={icon} size={16} />
          campus:\{address.replaceAll("/", "\\")}
        </span>
      </div>
      <div className="explorer">
        <aside className="explorer__info">
          <PixelIcon name={icon} size={48} className="explorer__info-icon" />
          <p className="explorer__info-title">{title}</p>
          <hr className="explorer__info-rule" />
          {descriptionHtml ? (
            <div
              className="explorer__info-text"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          ) : (
            <div className="explorer__info-text">{description}</div>
          )}
        </aside>
        <div className="explorer__main">{children}</div>
      </div>
      <div className="statusbar">
        <span>{status}</span>
        <span>CC BY-SA 4.0</span>
      </div>
    </>
  );
}
