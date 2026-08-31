import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildRepoRadar } from '@lib/repos';

const fixtureDir = path.resolve(__dirname, 'fixtures');
const searchResponse = JSON.parse(
  readFileSync(path.join(fixtureDir, 'github-search.json'), 'utf-8'),
);

describe('buildRepoRadar', () => {
  it('从 Search API 响应提取仓库，保持星数降序', () => {
    const radar = buildRepoRadar(searchResponse);

    const stars = radar.repos.map((r) => r.stars);
    expect(stars).toEqual([...stars].sort((a, b) => b - a));
  });

  it('过滤星数低于门槛（49 星）的仓库', () => {
    const radar = buildRepoRadar(searchResponse);

    expect(radar.repos.find((r) => r.fullName === 'low-star/practice-repo')).toBeUndefined();
    expect(radar.repos.every((r) => r.stars >= 50)).toBe(true);
  });

  it('过滤已归档仓库', () => {
    const radar = buildRepoRadar(searchResponse);

    expect(radar.repos.find((r) => r.fullName === 'archived/legacy')).toBeUndefined();
  });

  it('无 description 的仓库保留，description 为空串', () => {
    const radar = buildRepoRadar(searchResponse);

    const silent = radar.repos.find((r) => r.fullName === 'no-desc/silent');
    expect(silent).toBeDefined();
    expect(silent!.description).toBe('');
  });

  it('language 为 null 映射为 DOC', () => {
    const radar = buildRepoRadar(searchResponse);

    const skill = radar.repos.find((r) => r.fullName === 'SeanEllyJames/deep-research-skill');
    expect(skill!.language).toBe('DOC');
  });

  it('字段映射完整：fullName/url/createdAt', () => {
    const radar = buildRepoRadar(searchResponse);

    const top = radar.repos[0];
    expect(top).toMatchObject({
      fullName: 'Nanako0129/sepia',
      url: 'https://github.com/Nanako0129/sepia',
      createdAt: '2026-08-20T10:00:00Z',
      stars: 1026,
    });
  });

  it('截断到上限 20', () => {
    const many = {
      ...searchResponse,
      items: Array.from({ length: 35 }, (_, i) => ({
        ...searchResponse.items[0],
        id: i,
        full_name: `org/repo-${i}`,
        stargazers_count: 5000 - i,
      })),
    };

    expect(buildRepoRadar(many).repos).toHaveLength(20);
  });

  it('空 items / 非法输入返回空榜不抛异常', () => {
    expect(buildRepoRadar({ items: [] }).repos).toEqual([]);
    expect(buildRepoRadar({}).repos).toEqual([]);
    expect(buildRepoRadar(null).repos).toEqual([]);
  });
});
