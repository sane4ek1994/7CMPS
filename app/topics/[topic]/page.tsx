import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Window } from "@/components/desktop/Window";
import { Explorer } from "@/components/explorer/Explorer";
import { FileTable } from "@/components/explorer/FileTable";
import { getMaterialsForTopic, getTopic, getTopics } from "@/lib/content";
import { materialsCount } from "@/lib/format";
import { repoUrl, siteConfig } from "@/site.config";

export const dynamicParams = false;

export function generateStaticParams() {
  return getTopics().map((topic) => ({ topic: topic.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/topics/[topic]">): Promise<Metadata> {
  const { topic } = await params;
  const folder = getTopic(topic);
  return { title: folder?.title, description: folder?.summary };
}

export default async function TopicPage({ params }: PageProps<"/topics/[topic]">) {
  const { topic: id } = await params;
  const topic = getTopic(id);
  if (!topic) notFound();
  const all = getMaterialsForTopic(id);
  const own = all.filter((m) => m.section === "topics");
  const fromCohorts = all.filter((m) => m.section !== "topics");

  return (
    <Window id={topic.href} title={topic.title} icon={topic.icon}>
      <Explorer
        address={`topics/${id}`}
        upHref="/topics/"
        githubHref={`${repoUrl}/tree/${siteConfig.repo.branch}/topics/${id}`}
        icon={topic.icon}
        title={topic.title}
        descriptionHtml={topic.descriptionHtml}
        status={materialsCount(all.length)}
      >
        <h3 className="explorer__section-title">Материалы темы</h3>
        <FileTable materials={own} caption={`Материалы темы ${topic.title}`} context="cohort" />
        {fromCohorts.length > 0 && (
          <>
            <h3 className="explorer__section-title">Из потоков и проектов</h3>
            <FileTable
              materials={fromCohorts}
              caption={`Материалы потоков по теме ${topic.title}`}
              context="cohort"
            />
          </>
        )}
      </Explorer>
    </Window>
  );
}
