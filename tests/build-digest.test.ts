import { describe, expect, it } from 'vitest';
import { buildDailyDigests } from '@lib/build-digest';
import type { NewsEntry, RawEntry } from '@lib/types';

function raw(partial: Partial<RawEntry> & { title: string; link: string }): RawEntry {
  return { pubDate: 'Mon, 31 Aug 2026 10:00:00 +0800', sourceId: 'jiqizhixin', ...partial };
}

/** 直接构造去重后的 NewsEntry（buildDailyDigests 的输入） */
function news(partial: Partial<NewsEntry> & { title: string; link: string; pubDate: string }): NewsEntry {
  return { id: partial.link, summary: '', sources: ['jiqizhixin'], ...partial };
}

describe('buildDailyDigests', () => {
  it('按北京时间日期分组，日期倒序排列', () => {
    const digests = buildDailyDigests([
      news({ title: '昨夜新闻', link: 'https://a.com/1', pubDate: 'Sun, 30 Aug 2026 22:00:00 +0800' }),
      news({ title: '今晨新闻', link: 'https://a.com/2', pubDate: 'Mon, 31 Aug 2026 08:00:00 +0800' }),
      news({ title: '今日午间', link: 'https://a.com/3', pubDate: 'Mon, 31 Aug 2026 12:00:00 +0800' }),
    ]);

    expect(digests.map((d) => d.date)).toEqual(['2026-08-31', '2026-08-30']);
    expect(digests[0].entries).toHaveLength(2);
    expect(digests[1].entries).toHaveLength(1);
  });

  it('组内条目按时间倒序（最新在前）', () => {
    const digests = buildDailyDigests([
      news({ title: '早的', link: 'https://a.com/early', pubDate: 'Mon, 31 Aug 2026 06:00:00 +0800' }),
      news({ title: '晚的', link: 'https://a.com/late', pubDate: 'Mon, 31 Aug 2026 18:00:00 +0800' }),
    ]);

    expect(digests[0].entries.map((e) => e.title)).toEqual(['晚的', '早的']);
  });

  it('无法解析时间的条目被丢弃', () => {
    const digests = buildDailyDigests([
      news({ title: '正常', link: 'https://a.com/ok', pubDate: 'Mon, 31 Aug 2026 08:00:00 +0800' }),
      news({ title: '坏时间', link: 'https://a.com/bad', pubDate: 'garbage' }),
    ]);

    expect(digests).toHaveLength(1);
    expect(digests[0].entries.map((e) => e.title)).toEqual(['正常']);
  });

  it('超过 MAX 条目截断到上限（每天上限 40 条）', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      news({
        title: `新闻 ${i}`,
        link: `https://a.com/n${i}`,
        pubDate: 'Mon, 31 Aug 2026 08:00:00 +0800',
      }),
    );

    const digests = buildDailyDigests(many);
    expect(digests[0].entries).toHaveLength(40);
    // 截断保留的是时间更晚的（倒序后排前的）；时间全相同时保持稳定序
    expect(digests[0].entries[0].title).toBe('新闻 0');
  });

  it('空输入返回空数组', () => {
    expect(buildDailyDigests([])).toEqual([]);
  });

  it('跨年日期排序正确（纯字符串倒序即可保证）', () => {
    const digests = buildDailyDigests([
      news({ title: '去年', link: 'https://a.com/old', pubDate: 'Tue, 31 Dec 2025 22:00:00 +0800' }),
      news({ title: '新年', link: 'https://a.com/new', pubDate: 'Wed, 01 Jan 2026 08:00:00 +0800' }),
    ]);

    expect(digests.map((d) => d.date)).toEqual(['2026-01-01', '2025-12-31']);
  });
});
