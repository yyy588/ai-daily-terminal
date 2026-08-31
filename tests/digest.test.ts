import { describe, expect, it } from 'vitest';
import { dedupeEntries, toBeijingDate } from '@lib/digest';
import type { RawEntry } from '@lib/types';

/** 工厂：快速构造 RawEntry */
function entry(partial: Partial<RawEntry> & { title: string; link: string }): RawEntry {
  return {
    pubDate: 'Mon, 31 Aug 2026 10:00:00 +0800',
    sourceId: 'jiqizhixin',
    ...partial,
  };
}

describe('toBeijingDate', () => {
  it('RFC822 时间转北京时间日期字符串', () => {
    expect(toBeijingDate('Mon, 31 Aug 2026 08:30:00 +0800')).toBe('2026-08-31');
  });

  it('UTC 时间正确换算为北京时间（+8）', () => {
    // UTC 8月30日 20:00 = 北京 8月31日 04:00
    expect(toBeijingDate('Sun, 30 Aug 2026 20:00:00 GMT')).toBe('2026-08-31');
  });

  it('UTC 15:59 之后跨入北京次日', () => {
    expect(toBeijingDate('Sun, 30 Aug 2026 15:59:00 GMT')).toBe('2026-08-30');
    expect(toBeijingDate('Sun, 30 Aug 2026 16:00:00 GMT')).toBe('2026-08-31');
  });

  it('无法解析的时间返回 null', () => {
    expect(toBeijingDate('not a date')).toBeNull();
  });
});

describe('dedupeEntries', () => {
  it('完全相同的链接去重并合并来源', () => {
    const result = dedupeEntries([
      entry({ title: 'OpenAI 发布沙盒', link: 'https://a.com/x', sourceId: 'jiqizhixin' }),
      entry({ title: 'OpenAI 发布沙盒', link: 'https://a.com/x', sourceId: 'qbitai' }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].sources).toEqual(['jiqizhixin', 'qbitai']);
  });

  it('同一链接带 utm 跟踪参数也算重复（链接归一化）', () => {
    const result = dedupeEntries([
      entry({ title: 'DeepSeek 新模型', link: 'https://a.com/y', sourceId: 'jiqizhixin' }),
      entry({ title: 'DeepSeek 新模型发布', link: 'https://a.com/y?utm_source=rss', sourceId: 'qbitai' }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].sources).toEqual(['jiqizhixin', 'qbitai']);
  });

  it('标题高度相似（仅空格/大小写差异）也算重复', () => {
    const result = dedupeEntries([
      entry({ title: 'OpenAI发布Windows安全沙盒', link: 'https://a.com/m', sourceId: 'jiqizhixin' }),
      entry({ title: 'OpenAI 发布 Windows 安全沙盒', link: 'https://b.com/n', sourceId: 'qbitai' }),
    ]);

    expect(result).toHaveLength(1);
  });

  it('不相似的标题保留两条', () => {
    const result = dedupeEntries([
      entry({ title: '英伟达开源世界模型', link: 'https://a.com/p' }),
      entry({ title: '苹果将推出AI眼镜', link: 'https://b.com/q', sourceId: 'qbitai' }),
    ]);

    expect(result).toHaveLength(2);
  });

  it('摘要取自先出现的条目', () => {
    const result = dedupeEntries([
      entry({ title: '同题报道', link: 'https://a.com/s', description: '第一条的摘要' }),
      entry({ title: '同题报道', link: 'https://a.com/s', sourceId: 'qbitai', description: '第二条的摘要' }),
    ]);

    expect(result[0].summary).toContain('第一条的摘要');
  });

  it('空数组输入返回空数组', () => {
    expect(dedupeEntries([])).toEqual([]);
  });
});
