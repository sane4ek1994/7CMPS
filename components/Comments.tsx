"use client";

import Giscus from "@giscus/react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { useTheme } from "@/lib/theme";
import { isGiscusConfigured, repoUrl, siteConfig } from "@/site.config";

/**
 * Обсуждение на базе GitHub Discussions (giscus).
 * Ветка выбирается по фиксированному ключу `term`, а не по адресу страницы:
 * окно может оставаться открытым, когда адрес в браузере уже другой.
 */
export function Comments({ term, title }: { term: string; title?: string }) {
  const theme = useTheme();

  if (!isGiscusConfigured) {
    return (
      <div className="notice" role="note">
        <PixelIcon name="info" size={32} />
        <div>
          <p>
            <strong>Обсуждения ещё не подключены.</strong>
          </p>
          <p>
            Включите Discussions в репозитории, установите приложение giscus и заполните{" "}
            <code>giscus</code> в <code>site.config.ts</code> (подробно в README).
          </p>
          <p>
            А пока можно написать в{" "}
            <a href={`${repoUrl}/discussions`} target="_blank" rel="noopener noreferrer">
              GitHub Discussions
              <span className="visually-hidden"> (откроется в новой вкладке)</span>
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const { giscus } = siteConfig;
  return (
    <div className="giscus-frame-wrap" aria-label={title ? `Обсуждение: ${title}` : "Обсуждение"}>
      <Giscus
        repo={giscus.repo as `${string}/${string}`}
        repoId={giscus.repoId}
        category={giscus.category}
        categoryId={giscus.categoryId}
        mapping="specific"
        term={term}
        strict="1"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={theme === "dark" ? "dark" : "light"}
        lang="ru"
        loading="lazy"
      />
    </div>
  );
}
