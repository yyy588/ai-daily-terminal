/**
 * 站内链接拼接。GitHub Pages 部署在子路径（/ai-daily-terminal/），
 * 模板中所有站内跳转必须经过此函数，否则线上 404。
 * 与 astro.config.mjs 的 base 保持同源：改仓库名时只改这里。
 */
const BASE = '/ai-daily-terminal';

export function internalHref(path: string): string {
  // 外部绝对 URL 不动
  if (/^[a-z]+:\/\//i.test(path)) return path;

  // 已带前缀（防止重复拼接）
  if (path === BASE || path.startsWith(`${BASE}/`)) return path;

  // 去掉开头的斜杠统一拼接；空路径映射到首页
  const suffix = path.replace(/^\/+/, '');
  return suffix ? `${BASE}/${suffix}` : `${BASE}/`;
}
