import type { Metadata, Viewport } from "next";
import { DesktopIcons, type DesktopItem } from "@/components/desktop/DesktopIcons";
import { SkipToWindow, Taskbar, type StartMenuItem } from "@/components/desktop/Taskbar";
import { CachedWindows } from "@/components/desktop/Window";
import { WindowManagerProvider } from "@/components/desktop/WindowManager";
import { PixelText } from "@/components/pixel/PixelText";
import { getCohorts } from "@/lib/content";
import { themeInitScript } from "@/lib/theme-script";
import { repoUrl, siteConfig } from "@/site.config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} · ${siteConfig.shortName}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: "#008080",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const cohorts = getCohorts();

  const desktopItems: DesktopItem[] = [
    ...cohorts.map((cohort) => ({ label: cohort.title, href: cohort.href, icon: "folder" })),
    { label: "Все потоки", href: "/cohorts/", icon: "folderOpen" },
    { label: "Темы", href: "/topics/", icon: "cabinet" },
    { label: "Проекты", href: "/projects/", icon: "rocket" },
    { label: "Общение", href: "/chat/", icon: "chat" },
    { label: "О проекте", href: "/about/", icon: "info" },
  ];

  const startItems: StartMenuItem[] = [
    { label: "Потоки", href: "/cohorts/", icon: "folderOpen" },
    ...cohorts.map((cohort) => ({ label: cohort.title, href: cohort.href, icon: "folder" })),
    { label: "Темы", href: "/topics/", icon: "cabinet", separatorBefore: true },
    { label: "Проекты", href: "/projects/", icon: "rocket" },
    { label: "Общение", href: "/chat/", icon: "chat" },
    {
      label: "Как добавить материал",
      href: `${repoUrl}/blob/${siteConfig.repo.branch}/CONTRIBUTING.md`,
      icon: "docs",
      external: true,
      separatorBefore: true,
    },
    { label: "Репозиторий на GitHub", href: repoUrl, icon: "globe", external: true },
    { label: "О проекте", href: "/about/", icon: "info", separatorBefore: true },
  ];

  return (
    // data-theme меняет инлайн-скрипт до гидратации, поэтому расхождение атрибута ожидаемо.
    <html lang="ru" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <WindowManagerProvider>
          <SkipToWindow />
          <div className="desktop">
            <h1 className="visually-hidden">
              {siteConfig.name}: {siteConfig.shortName}
            </h1>
            <DesktopIcons items={desktopItems} />
            <div className="wallpaper" aria-hidden="true">
              <PixelText text="7 Кампус" pixel={6} className="wallpaper__logo" />
              <p className="wallpaper__caption">DevOps Campus · учимся вместе, делимся открыто</p>
            </div>
            <main className="desktop__windows">
              {children}
              <CachedWindows />
            </main>
          </div>
          <Taskbar startItems={startItems} />
        </WindowManagerProvider>
      </body>
    </html>
  );
}
