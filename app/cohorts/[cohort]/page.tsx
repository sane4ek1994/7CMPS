import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Window } from "@/components/desktop/Window";
import { Explorer } from "@/components/explorer/Explorer";
import { FileTable } from "@/components/explorer/FileTable";
import { getCohort, getCohorts, getMaterialsIn } from "@/lib/content";
import { materialsCount } from "@/lib/format";
import { repoUrl, siteConfig } from "@/site.config";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCohorts().map((cohort) => ({ cohort: cohort.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/cohorts/[cohort]">): Promise<Metadata> {
  const { cohort } = await params;
  const folder = getCohort(cohort);
  return { title: folder?.title, description: folder?.summary };
}

export default async function CohortPage({ params }: PageProps<"/cohorts/[cohort]">) {
  const { cohort: id } = await params;
  const cohort = getCohort(id);
  if (!cohort) notFound();
  const materials = getMaterialsIn("cohorts", id);

  return (
    <Window id={cohort.href} title={cohort.title} icon="folderOpen">
      <Explorer
        address={`cohorts/${id}`}
        upHref="/cohorts/"
        githubHref={`${repoUrl}/tree/${siteConfig.repo.branch}/cohorts/${id}`}
        icon="folderOpen"
        title={cohort.title}
        descriptionHtml={cohort.descriptionHtml}
        status={materialsCount(materials.length)}
      >
        <FileTable materials={materials} caption={`Материалы: ${cohort.title}`} />
      </Explorer>
    </Window>
  );
}
