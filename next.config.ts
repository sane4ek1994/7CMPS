import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сайт целиком статический: `next build` кладёт готовые HTML/CSS/JS в `out/`,
  // а Netlify раздаёт эту папку как есть. Сервер не нужен.
  output: "export",
  // `/topics/docker` -> `/topics/docker/index.html`: так статический хостинг
  // находит страницы без дополнительных правил переписывания.
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: {
    agentFeedback: true,
  },
  // Cache Components (PPR) несовместимы со статическим экспортом:
  // `next build` падает с "PPR cannot be enabled in export mode".
};

export default nextConfig;
