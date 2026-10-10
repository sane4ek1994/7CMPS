import type { Metadata } from "next";
import { Window } from "@/components/desktop/Window";
import { Explorer } from "@/components/explorer/Explorer";
import { IconGrid } from "@/components/explorer/IconGrid";
import { getMaterialsForTopic, getTopics } from "@/lib/content";
import { materialsCount, pluralize } from "@/lib/format";
import { repoUrl, siteConfig } from "@/site.config";

export const metadata: Metadata = { title: "Темы" };

export default function TopicsPage() {
  const topics = getTopics();
  return (
    <Window id="/topics/" title="Темы" icon="cabinet">
      <Explorer
        address="topics"
        upHref="/"
        githubHref={`${repoUrl}/tree/${siteConfig.repo.branch}/topics`}
        icon="cabinet"
        title="Темы"
        description={
          <p>
            Общие материалы по темам курса. В каждой теме собраны её собственные заметки и
            материалы всех потоков с этой темой.
          </p>
        }
        status={pluralize(topics.length, "тема", "темы", "тем")}
      >
        <IconGrid
          label="Темы"
          items={topics.map((topic) => ({
            href: topic.href,
            label: topic.title,
            icon: topic.icon,
            meta: materialsCount(getMaterialsForTopic(topic.id).length),
          }))}
        />
      </Explorer>
    </Window>
  );
}
