import type { Metadata } from "next";
import { Window } from "@/components/desktop/Window";
import { Explorer } from "@/components/explorer/Explorer";
import { FileTable } from "@/components/explorer/FileTable";
import { getMaterialsIn, getProjectsFolder } from "@/lib/content";
import { pluralize } from "@/lib/format";
import { repoUrl, siteConfig } from "@/site.config";

export const metadata: Metadata = { title: "Проекты" };

export default function ProjectsPage() {
  const folder = getProjectsFolder();
  const projects = getMaterialsIn("projects");
  return (
    <Window id="/projects/" title="Проекты" icon="rocket">
      <Explorer
        address="projects"
        upHref="/"
        githubHref={`${repoUrl}/tree/${siteConfig.repo.branch}/projects`}
        icon="rocket"
        title={folder.title}
        descriptionHtml={folder.descriptionHtml}
        status={pluralize(projects.length, "проект", "проекта", "проектов")}
      >
        <FileTable materials={projects} caption="Проекты студентов" context="cohort" />
      </Explorer>
    </Window>
  );
}
