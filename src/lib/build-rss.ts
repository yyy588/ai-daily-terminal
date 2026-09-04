import type { NewsData } from './types';

/**
 * news.json → RSS 2.0 XML（镜像 parse-rss：我们是聚合站，也输出自己的订阅源）。
 * 每个档案日一条 item：标题=日期、链接=详情页、description=当日 Top5 标题拼接。
 * 纯函数：base 参数化保证可测试。
 */

/** RFC822 时间（RSS 规范）：从 YYYY-MM-DD 构造北京时间正午，保持 +0800 时区显示 */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toRfc822(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y} 12:00:00 +0800`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildRssFeed(data: NewsData, base: string): string {
  const items = data.digests
    .map((digest) => {
      const top5 = digest.entries.slice(0, 5).map((e) => `· ${e.title}`).join('\n');
      const link = `${base}news/${digest.date}/`;
      return [
        '<item>',
        `<title>AI 要闻 ${escapeXml(digest.date)}</title>`,
        `<link>${link}</link>`,
        `<guid isPermaLink="true">${link}</guid>`,
        `<pubDate>${toRfc822(digest.date)}</pubDate>`,
        `<description>${escapeXml(top5)}</description>`,
        '</item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    '<title>AI_DAILY_TERMINAL // 每日 AI 要闻</title>',
    `<link>${base}</link>`,
    '<description>量子位+爱范儿+IT之家三源聚合，多源加权混排，GitHub 新锐榜与模型选型工作台</description>',
    `<lastBuildDate>${new Date(data.generatedAt || Date.now()).toUTCString()}</lastBuildDate>`,
    items,
    '</channel>',
    '</rss>',
  ]
    .filter(Boolean)
    .join('\n');
}
