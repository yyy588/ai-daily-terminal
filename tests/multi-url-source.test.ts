import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseRss } from '@lib/parse-rss';
import { filterEntries } from '@lib/filter';
import { sourceUrls } from '@lib/feeds.config';
import type { RawEntry } from '@lib/types';

const fixtureDir = path.resolve(__dirname, 'fixtures');
const hnrssXml = readFileSync(path.join(fixtureDir, 'hnrss.xml'), 'utf-8');

describe('parseRss × hnrss 结构', () => {
  it('解析 CDATA 标题与外链 link', () => {
    const entries = parseRss(hnrssXml, 'hackernews');

    expect(entries).toHaveLength(4);
    expect(entries[0]).toMatchObject({
      title: 'Pacman AI for controlling fusion systems makes key decision',
      link: 'https://example.com/pacman-fusion',
      sourceId: 'hackernews',
    });
  });

  it('description 为全文 HTML 时原样保留（后续 cleanSummary 统一截断）', () => {
    const entries = parseRss(hnrssXml, 'hackernews');
    expect(entries[0].description).toContain('Article URL');
  });

  it('RFC822 +0000 时间解析（HN 时区格式）', () => {
    const entries = parseRss(hnrssXml, 'hackernews');
    expect(entries[0].pubDate).toBe('Wed, 02 Sep 2026 23:28:56 +0000');
  });
});

describe('filterEntries × HN 闸门', () => {
  it('含 AI 词的英文条目放行，纯创业稿被拦', () => {
    const entries = parseRss(hnrssXml, 'hackernews');
    // filterEntries 按 FEED_SOURCES 配置判断豁免；hackernews 未配置豁免 → 走词表
    const passed = filterEntries(entries);

    const titles = passed.map((e) => e.title);
    expect(titles).toContain('AI-Memory 2.0 – The Best Memory System for Agents and Teams');
    expect(titles).not.toContain('Show HN: I built a pomodoro timer with Rust');
  });
});

describe('sourceUrls（多 URL 源支持）', () => {
  it('配置了 urls 数组的源返回全部 URL；只有 url 的源返回单元素数组', () => {
    const hackernews = sourceUrls({ id: 'x', name: 'x', url: '', urls: ['https://a/1', 'https://a/2'] });
    expect(hackernews).toEqual(['https://a/1', 'https://a/2']);

    const single = sourceUrls({ id: 'y', name: 'y', url: 'https://b/1' });
    expect(single).toEqual(['https://b/1']);
  });

  it('url 与 urls 都缺时返回空数组（不炸抓取层）', () => {
    expect(sourceUrls({ id: 'z', name: 'z' } as never)).toEqual([]);
  });
});
