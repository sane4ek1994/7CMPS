import type { Metadata } from "next";
import { Window } from "@/components/desktop/Window";
import { Explorer } from "@/components/explorer/Explorer";
import { IconGrid } from "@/components/explorer/IconGrid";
import { getCohorts, getMaterialsIn } from "@/lib/content";
import { materialsCount, pluralize } from "@/lib/format";
import { repoUrl, siteConfig } from "@/site.config";

export const metadata: Metadata = { title: "Потоки" };

export default function CohortsPage() {
  const cohorts = getCohorts();
  return (
    <Window id="/cohorts/" title="Потоки" icon="folderOpen">
      <Explorer
        address="cohorts"
        upHref="/"
        githubHref={`${repoUrl}/tree/${siteConfig.repo.branch}/cohorts`}
        icon="folderOpen"
        title="Потоки"
        description={
          <p>
            У каждого потока своя папка с конспектами, презентациями и примерами документации.
            Новый поток — это новая папка в <code>cohorts/</code>.
          </p>
        }
        status={pluralize(cohorts.length, "поток", "потока", "потоков")}
      >
        <IconGrid
          label="Потоки"
          items={cohorts.map((cohort) => ({
            href: cohort.href,
            label: cohort.title,
            icon: "folder",
            meta: materialsCount(getMaterialsIn("cohorts", cohort.id).length),
          }))}
        />
      </Explorer>
    </Window>
  );
}
