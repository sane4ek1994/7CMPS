// Общие настройки хаба. Значения giscus не секретные: их показывает
// https://giscus.app после выбора репозитория. Их можно задать здесь или
// переменными окружения NEXT_PUBLIC_GISCUS_* (например, в настройках Netlify).

export const siteConfig = {
  name: "DevOps Campus",
  shortName: "7 Кампус",
  description:
    "Open-source хаб студентов DevOps: конспекты, презентации, примеры документации и практические проекты. Материалы добавляются через pull request.",
  repo: {
    owner: "sane4ek1994",
    name: "7CMPS",
    branch: "main",
  },
  giscus: {
    repo: process.env.NEXT_PUBLIC_GISCUS_REPO ?? "sane4ek1994/7CMPS",
    repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? "",
    category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? "Комментарии",
    categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? "",
  },
  // Каналы окна «Общение»: у каждого своё обсуждение в GitHub Discussions.
  chatChannels: [
    {
      id: "lounge",
      title: "Общий чат",
      description: "Знакомство, новости потока, всё, что не подходит под другие каналы.",
    },
    {
      id: "help",
      title: "Помогите разобраться",
      description: "Вопросы по темам курса: что не работает и что уже пробовали.",
    },
    {
      id: "showcase",
      title: "Покажи проект",
      description: "Ссылки на свои репозитории и демо, просьбы о ревью.",
    },
  ],
} as const;

export const repoUrl = `https://github.com/${siteConfig.repo.owner}/${siteConfig.repo.name}`;

export function githubFileUrl(filePath: string, mode: "blob" | "edit" = "blob") {
  return `${repoUrl}/${mode}/${siteConfig.repo.branch}/${filePath}`;
}

export const isGiscusConfigured = Boolean(
  siteConfig.giscus.repo && siteConfig.giscus.repoId && siteConfig.giscus.categoryId,
);
