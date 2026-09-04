import type { APIRoute } from 'astro';
import { loadSiteData } from '../lib/site';
import { buildRssFeed } from '../lib/build-rss';

/** RSS 订阅源：每日一条汇总 item（astro.config 的 site/base 决定绝对地址） */
export const GET: APIRoute = () => {
  const data = loadSiteData();
  const xml = buildRssFeed(data, 'https://yyy588.github.io/ai-daily-terminal/');
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
