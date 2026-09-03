/**
 * WebDev 五维筛选（arena.astro 与 [dimension].astro 共用同源配置）。
 * id = arena.json 的 board id；slug = 站内路径段（空串 = /arena/ 本页）。
 */
export const ARENA_FILTERS: readonly { id: string; label: string; slug: string }[] = [
  { id: 'webdev', label: '🏆 综合', slug: '' },
  { id: 'webdev-fullstack', label: '🧱 全栈', slug: 'webdev-fullstack' },
  { id: 'webdev-frontend', label: '🖥️ 前端', slug: 'webdev-frontend' },
  { id: 'webdev-html', label: '🧩 HTML', slug: 'webdev-html' },
  { id: 'webdev-react', label: '🧩 React', slug: 'webdev-react' },
];
