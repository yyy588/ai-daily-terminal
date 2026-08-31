import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { mergeRadarChannels } from '@lib/repos';

const fixtureDir = path.resolve(__dirname, 'fixtures');
const enResponse = JSON.parse(readFileSync(path.join(fixtureDir, 'github-search.json'), 'utf-8'));

/** 模拟中文通道的 API 响应 */
const zhResponse = {
  total_count: 120,
  items: [
    {
      id: 101,
      full_name: 'crunz-ai/nativePDF-structurer',
      description: '零 OCR、零模型依赖的文档结构化工具',
      html_url: 'https://github.com/crunz-ai/nativePDF-structurer',
      stargazers_count: 153,
      language: 'Python',
      created_at: '2026-08-22T00:00:00Z',
    },
    {
      id: 102,
      full_name: 'agents-universe/agents-universe',
      description: '让智能体像人一样学习和工作',
      html_url: 'https://github.com/agents-universe/agents-universe',
      stargazers_count: 199,
      language: 'TypeScript',
      created_at: '2026-08-23T00:00:00Z',
    },
    // 与英文通道重复（同仓库在两个通道都出现）
    {
      id: 1,
      full_name: 'Nanako0129/sepia',
      description: '可本地部署的 AI 照片风格迁移工具',
      html_url: 'https://github.com/Nanako0129/sepia',
      stargazers_count: 1026,
      language: 'Python',
      created_at: '2026-08-20T10:00:00Z',
    },
    // 星数低于门槛
    {
      id: 103,
      full_name: 'small/zh-repo',
      description: '小项目',
      html_url: 'https://github.com/small/zh-repo',
      stargazers_count: 30,
      language: 'Python',
      created_at: '2026-08-25T00:00:00Z',
    },
  ],
};

describe('mergeRadarChannels', () => {
  it('双通道合并：去重（按 fullName），星数取最新值，统一降序', () => {
    const merged = mergeRadarChannels([enResponse, zhResponse]);

    const names = merged.repos.map((r) => r.fullName);
    // sepia 在两通道都出现，只保留一份
    expect(names.filter((n) => n === 'Nanako0129/sepia')).toHaveLength(1);
    // 降序
    const stars = merged.repos.map((r) => r.stars);
    expect(stars).toEqual([...stars].sort((a, b) => b - a));
  });

  it('中文通道的仓库进入榜单（高于英文通道同星数项目）', () => {
    const merged = mergeRadarChannels([enResponse, zhResponse]);

    expect(merged.repos.find((r) => r.fullName === 'agents-universe/agents-universe')).toBeDefined();
    expect(merged.repos.find((r) => r.fullName === 'crunz-ai/nativePDF-structurer')).toBeDefined();
  });

  it('门槛与上限在合并后统一执行', () => {
    const merged = mergeRadarChannels([enResponse, zhResponse]);

    expect(merged.repos.every((r) => r.stars >= 50)).toBe(true);
    expect(merged.repos.find((r) => r.fullName === 'small/zh-repo')).toBeUndefined();
    expect(merged.repos.find((r) => r.fullName === 'low-star/practice-repo')).toBeUndefined();
  });

  it('截断到 MAX_REPOS（合并后总数超上限时）', () => {
    const many = {
      items: Array.from({ length: 15 }, (_, i) => ({
        ...enResponse.items[0],
        id: i,
        full_name: `org/a-${i}`,
        stargazers_count: 900 - i,
      })),
    };
    const many2 = {
      items: Array.from({ length: 15 }, (_, i) => ({
        ...enResponse.items[0],
        id: 100 + i,
        full_name: `org/b-${i}`,
        stargazers_count: 800 - i,
      })),
    };

    expect(mergeRadarChannels([many, many2]).repos).toHaveLength(20);
  });

  it('单通道为空/异常时其余通道照常产出', () => {
    const merged = mergeRadarChannels([enResponse, null, {}]);
    expect(merged.repos.length).toBeGreaterThan(0);
    expect(mergeRadarChannels([null, null]).repos).toEqual([]);
  });
});
