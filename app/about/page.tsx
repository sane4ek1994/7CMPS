import type { Metadata } from "next";
import { OpenLink, Window } from "@/components/desktop/Window";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { getCohorts, getMaterials, getTopics } from "@/lib/content";
import { repoUrl, siteConfig } from "@/site.config";

export const metadata: Metadata = { title: "О проекте" };

export default function AboutPage() {
  const { branch } = siteConfig.repo;
  return (
    <Window id="/about/" title="О проекте" icon="info" variant="dialog">
      <div className="pane">
        <div className="about">
          <div className="about__hero">
            <PixelIcon name="campus" size={64} />
            <p>
              <strong>{siteConfig.name}</strong> — open-source хаб студентов, которые учатся DevOps
              на платформе «Просто DevOps». Первый поток проекта называется{" "}
              <strong>«{siteConfig.shortName}»</strong>.
            </p>
          </div>

          <p>
            Сейчас здесь {getCohorts().length} поток(а), {getTopics().length} тем и{" "}
            {getMaterials().length} материалов. Всё это лежит в обычном Git-репозитории в виде
            Markdown-файлов.
          </p>

          <h3>Что здесь есть</h3>
          <ul>
            <li>
              <OpenLink href="/cohorts/">Потоки</OpenLink>: конспекты, презентации и примеры
              документации каждого потока.
            </li>
            <li>
              <OpenLink href="/topics/">Темы</OpenLink>: Linux, Docker, CI/CD, Kubernetes, Terraform
              и всё, что добавят дальше.
            </li>
            <li>
              <OpenLink href="/projects/">Проекты</OpenLink>: практические работы студентов.
            </li>
            <li>
              <OpenLink href="/chat/">Общение</OpenLink>: каналы на базе GitHub Discussions.
            </li>
          </ul>

          <h3>Как добавить свой материал</h3>
          <ol>
            <li>Сделайте форк репозитория или создайте ветку.</li>
            <li>
              Положите Markdown-файл в <code>cohorts/&lt;номер потока&gt;/</code>,{" "}
              <code>topics/&lt;тема&gt;/</code> или <code>projects/</code>.
            </li>
            <li>Заполните frontmatter по шаблону и откройте pull request.</li>
          </ol>
          <p>
            Подробности в{" "}
            <a
              href={`${repoUrl}/blob/${branch}/CONTRIBUTING.md`}
              target="_blank"
              rel="noopener noreferrer"
            >
              CONTRIBUTING.md
              <span className="visually-hidden"> (откроется в новой вкладке)</span>
            </a>
            . После слияния сайт пересоберётся сам.
          </p>

          <h3>Лицензии</h3>
          <p>
            Код сайта распространяется по лицензии MIT, учебные материалы — по CC BY-SA 4.0: их
            можно копировать и переделывать с указанием авторства и на тех же условиях.
          </p>

          <h3>Без бэкенда</h3>
          <p>
            Сайт статический: его собирает Next.js, публикует Netlify, а обсуждения хранятся в
            GitHub Discussions. Регистрации и базы данных нет, достаточно аккаунта GitHub.
            Интерфейс, иконки и пиксельный шрифт нарисованы для проекта и не используют чужие
            логотипы.
          </p>
        </div>
      </div>
    </Window>
  );
}
