import { describe, expect, it } from 'vitest';
import { mergeWithHistory } from '@lib/pipeline';
import type { DailyDigest, NewsData, RawEntry } from '@lib/types';

function raw(partial: Partial<RawEntry> & { title: string; link: string }): RawEntry {
  return { pubDate: 'Mon, 31 Aug 2026 10:00:00 +0800', sourceId: 'jiqizhixin', ...partial };
}

/** 模拟已有历史数据（上次构建产物） */
function historyData(dates: string[]): NewsData {
  return {
    generatedAt: '2026-08-30T00:00:00.000Z',
    digests: dates.map((date) => ({
      date,
      entries: [
        {
          id: `https://a.com/old-${date}`,
          title: `${date} 的历史新闻`,
          link: `https://a.com/old-${date}`,
          pubDate: `${date}T10:00:00+08:00`,
          summary: '历史摘要',
          sources: ['jiqizhixin'],
        },
      ],
    })),
  };
}

describe('mergeWithHistory', () => {
  it('新数据与历史合并：今日新增 + 历史保留，整体日期倒序', () => {
    const history = historyData(['2026-08-29', '2026-08-28']);
    const fresh = [
      raw({ title: '今日新闻', link: 'https://a.com/new-1' }),
    ];

    const merged = mergeWithHistory(fresh, history, 30);

    expect(merged.digests.map((d) => d.date)).toEqual(['2026-08-31', '2026-08-29', '2026-08-28']);
  });

  it('同一天历史存在时，新条目与旧条目按链接去重合并（增量更新）', () => {
    const history: NewsData = {
      generatedAt: '2026-08-31T00:00:00.000Z',
      digests: [
        {
          date: '2026-08-31',
          entries: [
            {
              id: 'https://a.com/morning',
              title: '早间已收录',
              link: 'https://a.com/morning',
              pubDate: '2026-08-31T08:00:00+08:00',
              summary: '早',
              sources: ['jiqizhixin'],
            },
          ],
        },
      ],
    };
    const fresh = [
      // 同一条（重复抓到）
      raw({ title: '早间已收录', link: 'https://a.com/morning', pubDate: '2026-08-31T08:00:00+08:00' }),
      // 新条目
      raw({ title: '午后新增', link: 'https://a.com/noon', pubDate: '2026-08-31T14:00:00+08:00' }),
    ];

    const merged = mergeWithHistory(fresh, history, 30);

    const today = merged.digests.find((d) => d.date === '2026-08-31')!;
    // 组内时间倒序：午后的在早间的之前
    expect(today.entries.map((e) => e.title)).toEqual(['午后新增', '早间已收录']);
  });

  it('历史裁剪到保留天数上限（rolling window）', () => {
    const dates = Array.from({ length: 40 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 7, 1) + i * 86_400_000);
      return d.toISOString().slice(0, 10);
    });
    const history = historyData(dates);

    const merged = mergeWithHistory([], history, 30);

    expect(merged.digests.length).toBeLessThanOrEqual(30);
    // 保留的是最近的（fixture 从 8/1 起推 40 天，最新一天是 9/9）
    expect(merged.digests[0].date).toBe('2026-09-09');
    expect(merged.digests[merged.digests.length - 1].date).toBe('2026-08-11');
  });

  it('历史为空（首次构建）也能产出', () => {
    const merged = mergeWithHistory([raw({ title: 'a', link: 'https://a.com/x' })], null, 30);

    expect(merged.digests).toHaveLength(1);
    expect(merged.digests[0].entries[0].title).toBe('a');
    expect(merged.generatedAt).toBeTruthy();
  });

  it('全新条目为空且历史为空时返回空结构（不抛异常）', () => {
    const merged = mergeWithHistory([], null, 30);
    expect(merged.digests).toEqual([]);
  });
});
