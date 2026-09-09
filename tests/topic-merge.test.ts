import { describe, expect, it } from 'vitest';
import { bigramSimilarity, mergeByTopic, pickWithQuota } from '@lib/topic-merge';
import type { ScoredEntry } from '@lib/scoring';
import type { NewsEntry } from '@lib/types';

function entry(partial: Partial<NewsEntry> & { title: string; sources: string[] }): NewsEntry {
  return {
    id: partial.title,
    link: `https://x.com/${encodeURIComponent(partial.title)}`,
    pubDate: 'Wed, 09 Sep 2026 10:00:00 +0800',
    summary: '',
    ...partial,
  } as NewsEntry;
}

describe('bigramSimilarity（标题字符 2-gram Jaccard）', () => {
  it('同题材不同写法的中文标题相似度高', () => {
    const a = 'DeepSeek 计划 9 月 10 日前后发布新一代模型';
    const b = 'DeepSeek 新一代模型将于 9 月 10 日左右发布';
    expect(bigramSimilarity(a, b)).toBeGreaterThan(0.5);
  });

  it('完全不同题材相似度低', () => {
    const a = 'DeepSeek 计划 9 月 10 日前后发布新一代模型';
    const b = '奥之心新款 PEN 复古无反相机曝光：204 万像素';
    expect(bigramSimilarity(a, b)).toBeLessThan(0.2);
  });

  it('相同标题 = 1，无共享 = 0', () => {
    expect(bigramSimilarity('苹果发布AI眼镜', '苹果发布AI眼镜')).toBe(1);
    expect(bigramSimilarity('苹果发布', '华为上市')).toBe(0);
  });
});

describe('mergeByTopic（跨源同题材合并）', () => {
  it('不同源同题材合并为一条，sources 聚合，保留分高者标题', () => {
    const entries = [
      entry({ title: 'DeepSeek 计划 9 月 10 日前后发布新一代模型', sources: ['ithome'] }),
      entry({ title: 'DeepSeek 新一代模型将于 9 月 10 日左右发布', sources: ['qbitai'] }),
      entry({ title: '完全无关的另一条新闻', sources: ['qbitai'] }),
    ];

    const merged = mergeByTopic(entries);
    expect(merged).toHaveLength(2);

    const ds = merged.find((e) => e.title.includes('DeepSeek'))!;
    expect(ds.sources.sort()).toEqual(['ithome', 'qbitai']);
  });

  it('同源相似标题不合并（防止误吞同源系列稿）', () => {
    const entries = [
      entry({ title: '苹果发布 AI 眼镜售价两千元', sources: ['ithome'] }),
      entry({ title: '苹果发布 AI 眼镜上架开售', sources: ['ithome'] }),
    ];
    expect(mergeByTopic(entries)).toHaveLength(2);
  });

  it('阈值边缘：相似度不足阈值的保留两条', () => {
    const entries = [
      entry({ title: '苹果发布 AI 眼镜', sources: ['ithome'] }),
      entry({ title: '华为发布鸿蒙电脑', sources: ['qbitai'] }),
    ];
    expect(mergeByTopic(entries)).toHaveLength(2);
  });
});

describe('pickWithQuota（每源每日配额）', () => {
  function scored(titles: string[], sources: string[]): ScoredEntry[] {
    return titles.map((t, i) => ({
      id: t, title: t, link: `https://x/${i}`, pubDate: 'Wed, 09 Sep 2026 10:00:00 +0800',
      summary: '', sources: [sources[i]], score: 10 - i,
    }));
  }

  it('单源最多取 2 条，其余让位给低分他源条目', () => {
    const pool = scored(
      ['it1', 'it2', 'it3', 'it4', 'qb1', 'qb2'],
      ['ithome', 'ithome', 'ithome', 'ithome', 'qbitai', 'qbitai'],
    );
    const picked = pickWithQuota(pool, 4);

    const itCount = picked.filter((e) => e.sources[0] === 'ithome').length;
    expect(itCount).toBe(2); // it3/it4 被配额拦下
    expect(picked).toHaveLength(4); // 由 qb1/qb2 补位
  });

  it('不足配额时全取；跨日条目按(源,日)组合计配额', () => {
    const pool = scored(['a', 'b'], ['ithome', 'qbitai']);
    expect(pickWithQuota(pool, 10)).toHaveLength(2);
  });
});
