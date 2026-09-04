import { describe, expect, it } from 'vitest';
import { buildRssFeed } from '@lib/build-rss';
import type { NewsData } from '@lib/types';

function digest(date: string, titles: string[]) {
  return {
    date,
    entries: titles.map((title, i) => ({
      id: `id-${date}-${i}`,
      title,
      link: `https://example.com/${date}/${i}`,
      pubDate: `${date}T10:0${i}:00+08:00`,
      summary: `${title} 的摘要`,
      sources: ['qbitai'],
    })),
  };
}

const data: NewsData = {
  generatedAt: '2026-09-04T02:00:00.000Z',
  digests: [
    digest('2026-09-04', ['头条新闻一', '第二条新闻', '第三条', '第四条', '第五条', '第六条超长标题也应被截断到五条']),
    digest('2026-09-03', ['昨天的新闻']),
  ],
};

describe('buildRssFeed（news.json → RSS XML）', () => {
  const xml = buildRssFeed(data, 'https://yyy588.github.io/ai-daily-terminal/');

  it('RSS 2.0 骨架：channel 标题/链接/描述 + rss version', () => {
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<title>AI_DAILY_TERMINAL // 每日 AI 要闻</title>');
    expect(xml).toContain('<link>https://yyy588.github.io/ai-daily-terminal/</link>');
  });

  it('每个档案日一条 item，最新在前', () => {
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    expect(items).toHaveLength(2);
    expect(items[0][1]).toContain('2026-09-04');
  });

  it('item 标题与链接指向该日详情页', () => {
    const first = xml.match(/<item>([\s\S]*?)<\/item>/)![1];
    expect(first).toContain('<title>AI 要闻 2026-09-04</title>');
    expect(first).toContain('<link>https://yyy588.github.io/ai-daily-terminal/news/2026-09-04/</link>');
  });

  it('description 为当日 Top5 标题拼接（第 6 条不出现）', () => {
    const first = xml.match(/<item>([\s\S]*?)<\/item>/)![1];
    expect(first).toContain('头条新闻一');
    expect(first).toContain('第五条');
    expect(first).not.toContain('第六条');
  });

  it('XML 转义：标题含 & < > 时不炸且正确转义', () => {
    const dirty: NewsData = {
      generatedAt: '',
      digests: [digest('2026-09-04', ['GPT-5 & Claude <对比> "测试"'])],
    };
    const x = buildRssFeed(dirty, 'https://x/');
    expect(x).toContain('GPT-5 &amp; Claude &lt;对比&gt;');
    expect(() => x).not.toThrow();
  });

  it('pubDate 为 RFC822 格式（含时区）', () => {
    const first = xml.match(/<item>([\s\S]*?)<\/item>/)![1];
    expect(first).toMatch(/<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} \+0800<\/pubDate>/);
  });

  it('空档案返回空 channel 不炸', () => {
    const x = buildRssFeed({ generatedAt: '', digests: [] }, 'https://x/');
    expect(x).toContain('<channel>');
    expect(x).not.toContain('<item>');
  });
});
