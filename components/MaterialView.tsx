import { Comments } from "@/components/Comments";
import { OpenLink, Window } from "@/components/desktop/Window";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { getCohort, getTopic } from "@/lib/content";
import { formatDate, githubProfile } from "@/lib/format";
import { KIND_LABELS, type Material } from "@/lib/types";
import { githubFileUrl } from "@/site.config";

function parentOf(material: Material) {
  if (material.section === "projects") return { href: "/projects/", title: "Проекты" };
  if (material.section === "cohorts") {
    const cohort = getCohort(material.group);
    return { href: `/cohorts/${material.group}/`, title: cohort?.title ?? material.group };
  }
  const topic = getTopic(material.group);
  return { href: `/topics/${material.group}/`, title: topic?.title ?? material.group };
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="visually-hidden"> (откроется в новой вкладке)</span>
    </a>
  );
}

/** Окно с материалом: панель действий, «свойства файла», текст и обсуждение. */
export function MaterialView({ material, html }: { material: Material; html: string }) {
  const parent = parentOf(material);
  const topic = material.topic ? getTopic(material.topic) : undefined;
  const cohort = material.cohort ? getCohort(material.cohort) : undefined;
  const profile = githubProfile(material.author);
  const icon = material.kind === "project" ? "rocket" : material.kind;

  return (
    <Window id={material.href} title={material.title} icon={icon} variant="document">
      <div className="doc-view">
        <div className="toolbar">
          <OpenLink href={parent.href} className="btn">
            <span aria-hidden="true">↑</span> {parent.title}
          </OpenLink>
          <a
            className="btn"
            href={githubFileUrl(material.filePath)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Исходник<span className="visually-hidden"> на GitHub (откроется в новой вкладке)</span>
          </a>
          <a
            className="btn"
            href={githubFileUrl(material.filePath, "edit")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Предложить правку
            <span className="visually-hidden"> (откроется в новой вкладке)</span>
          </a>
        </div>
        <div className="doc-scroll" tabIndex={0} aria-label={`Текст: ${material.title}`}>
          <article className="doc">
            <p className="doc__kicker">
              <PixelIcon name={icon} size={16} />
              {KIND_LABELS[material.kind]}
            </p>
            <p className="doc__title" aria-hidden="true">
              {material.title}
            </p>
            <dl className="properties">
              <dt>Автор</dt>
              <dd>
                {profile ? (
                  <ExternalLink href={profile}>{material.author}</ExternalLink>
                ) : (
                  material.author
                )}
              </dd>
              <dt>Дата</dt>
              <dd>
                <time dateTime={material.date}>{formatDate(material.date)}</time>
              </dd>
              {topic && (
                <>
                  <dt>Тема</dt>
                  <dd>
                    <OpenLink href={topic.href}>{topic.title}</OpenLink>
                  </dd>
                </>
              )}
              {cohort && (
                <>
                  <dt>Поток</dt>
                  <dd>
                    <OpenLink href={cohort.href}>{cohort.title}</OpenLink>
                  </dd>
                </>
              )}
              {material.repo && (
                <>
                  <dt>Репозиторий</dt>
                  <dd>
                    <ExternalLink href={material.repo}>{material.repo}</ExternalLink>
                  </dd>
                </>
              )}
              {material.demo && (
                <>
                  <dt>Демо</dt>
                  <dd>
                    <ExternalLink href={material.demo}>{material.demo}</ExternalLink>
                  </dd>
                </>
              )}
              {material.tags.length > 0 && (
                <>
                  <dt>Теги</dt>
                  <dd>
                    <ul className="tag-list" aria-label="Теги">
                      {material.tags.map((tag) => (
                        <li key={tag} className="tag">
                          {tag}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </>
              )}
            </dl>
            <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
          </article>
          <section className="comments" aria-labelledby={`comments-${material.id}`}>
            <h3 className="comments__title" id={`comments-${material.id}`}>
              <PixelIcon name="chat" size={24} />
              Обсуждение
            </h3>
            <Comments term={material.id} title={material.title} />
          </section>
        </div>
        <div className="statusbar">
          <span>{material.filePath}</span>
          <span>CC BY-SA 4.0</span>
        </div>
      </div>
    </Window>
  );
}
