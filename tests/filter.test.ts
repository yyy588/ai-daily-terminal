import { describe, expect, it } from 'vitest';
import { matchesAiKeywords, filterEntries } from '@lib/filter';
import type { RawEntry } from '@lib/types';

function entry(title: string, sourceId = 'ithome'): RawEntry {
  return { title, link: `https://x.com/${encodeURIComponent(title)}`, pubDate: 'Wed, 02 Sep 2026 08:00:00 GMT', sourceId };
}

describe('matchesAiKeywords', () => {
  it('命中 AI 词表的标题返回 true', () => {
    expect(matchesAiKeywords('马斯克预告 Grok 4.7 十天后上线')).toBe(true);
    expect(matchesAiKeywords('OpenAI 发布 Windows 安全沙盒')).toBe(true);
    expect(matchesAiKeywords('最强模型 Fable 5.1 发布')).toBe(false); // 无词表词——见下方词表测试
  });

  it('AI 大小写不敏感', () => {
    expect(matchesAiKeywords('小米澎湃 HyperOS 超级小爱 ai 专家模式上线')).toBe(true);
    expect(matchesAiKeywords('AI 绘画工具对比')).toBe(true);
  });

  it('纯手机/家电/汽车稿不命中', () => {
    expect(matchesAiKeywords('小米米家夜灯 4 发布：8 个月长续航，单只 59 元')).toBe(false);
    expect(matchesAiKeywords('雷军晒 18 Fold 阔折叠真机，红色外壳')).toBe(false);
    expect(matchesAiKeywords('三星 Galaxy S27 通过 3C 认证')).toBe(false);
  });

  it('提到大模型/智能体的稿件命中', () => {
    expect(matchesAiKeywords('国产大模型集体降价，智能体赛道开卷')).toBe(true);
  });
});

describe('filterEntries（按源开关）', () => {
  it('filterByKeywords 源：不命中的被丢弃，命中的保留', () => {
    const result = filterEntries([
      entry('小米智能插座 4 发布，众筹 49 元'),
      entry('DeepSeek 新模型推理成本再降四成'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toContain('DeepSeek');
  });

  it('豁免源（如 qbitai）全量保留，即使标题不含关键词', () => {
    const result = filterEntries([
      entry('徐梦迪成了清华姚班班主任', 'qbitai'),
      entry('20ms 把 PDF 变成 Markdown', 'qbitai'),
    ]);
    expect(result).toHaveLength(2);
  });

  it('空数组透传', () => {
    expect(filterEntries([])).toEqual([]);
  });
});
