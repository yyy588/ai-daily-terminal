// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages 项目站点：仓库名作为 base 路径。
  // 若改用 <username>.github.io 仓库，请将 base 改为 '/'。
  site: 'https://yyy588.github.io',
  base: '/ai-daily-terminal/',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
