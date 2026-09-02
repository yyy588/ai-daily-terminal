import { describe, expect, it } from 'vitest';
import { scoreEntry, sortByScore } from '@lib/scoring';
import type { NewsEntry } from '@lib/types';

const NOW = Date.parse('2026-09-02T12:00:00+08:00');

/** hoursAgo 小时前发布的 NewsEntry */
function news(partial: Partial<NewsEntry> & { title: string; hoursAgo: number }): NewsEntry {
  return {
    id: `id-${partial.title}`,
    link: `https://x.com/${encodeURIComponent(partial.title)}`,
    pubDate: new Date(NOW - partial.hoursAgo * 3_600_000).toISOString(),
    summary: '',
    sources: ['qbitai'],
    ...partial,
    // 防止 pubDate 被覆盖后 hoursAgo 失效：显式用 hoursAgo 生成 pubDate
    ...(partial.pubDate ? {} : {}),
  };
}

function entryAt(title: string, hoursAgo: number, sources: string[], pubDate?: string): NewsEntry {
  return {
    id: title,
    title,
    link: `https://x.com/${encodeURIComponent(title)}`,
    pubDate: pubDate ?? new Date(NOW - hoursAgo * 3_600_000).toISOString(),
    summary: '',
    sources,
  };
}

describe('scoreEntry', () => {
  it('权重 3 源、刚发布：分数接近 3', () => {
    const s = scoreEntry(entryAt('刚发', 0, ['qbitai']), NOW);
    expect(s).toBeGreaterThan(2.9);
    expect(s).toBeLessThanOrEqual(3);
  });

  it('时间衰减：12 小时半衰期，隔夜量子位稿 ≈ 1.5', () => {
    const s = scoreEntry(entryAt('隔夜', 12, ['qbitai']), NOW);
    expect(s).toBeCloseTo(3 * Math.exp(-1), 5);
  });

  it('共报加成：每多一个源 +0.5', () => {
    const single = scoreEntry(entryAt('单源', 6, ['qbitai']), NOW);
    const cross = scoreEntry(entryAt('双源', 6, ['qbitai', 'ithome']), NOW);
    expect(cross - single).toBeCloseTo(0.5, 5);
  });

  it('多源报道取最高权重源的权重', () => {
    // 爱范儿(2) + IT之家(1.5) 共报，权重取 2
    const s = scoreEntry(entryAt('共报', 0, ['ifanr', 'ithome']), NOW);
    expect(s).toBeCloseTo(2.5, 5); // 2 + 0.5 共报加成
  });

  it('压线案例：隔夜量子位大稿 vs 刚发的 IT之家小稿', () => {
    const overnight = scoreEntry(entryAt('量子位隔夜12h', 12, ['qbitai']), NOW);
    const fresh = scoreEntry(entryAt('IT之家刚发', 0.5, ['ithome']), NOW);
    // 3×e^-1=1.104 vs 1.5×e^-(0.5/12)=1.439 —— IT之家反超（符合"新消息优先"意图）
    expect(fresh).toBeGreaterThan(overnight);
  });

  it('反转案例：双源共报的量子位 10h 稿 > IT之家 1h 稿', () => {
    const bigNews = scoreEntry(entryAt('共报大稿', 10, ['qbitai', 'ifanr']), NOW);
    const small = scoreEntry(entryAt('小稿', 1, ['ithome']), NOW);
    // (3+0.5)×e^(-10/12)=1.395 vs 1.5×e^(-1/12)=1.379 —— 共报大稿险胜
    expect(bigNews).toBeGreaterThan(small);
  });
});

describe('sortByScore', () => {
  it('按分数降序稳定排序，不修改原数组', () => {
    const arr = [
      entryAt('旧小', 24, ['ithome']),
      entryAt('新大', 1, ['qbitai']),
      entryAt('中', 8, ['ifanr']),
    ];
    const sorted = sortByScore(arr, NOW);
    expect(sorted.map((e) => e.title)).toEqual(['新大', '中', '旧小']);
    expect(arr[0].title).toBe('旧小'); // 原数组未动（不可变性）
  });

  it('带出 score 字段供模板消费', () => {
    const sorted = sortByScore([entryAt('一条', 0, ['qbitai'])], NOW);
    expect(sorted[0].score).toBeGreaterThan(2.9);
  });
});
