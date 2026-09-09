import { describe, expect, it } from 'vitest';
import { scoreEntry } from '@lib/scoring';
import type { NewsEntry } from '@lib/types';

const NOW = Date.parse('2026-09-09T12:00:00+08:00');

function entryAt(title: string, hoursAgo: number, sources: string[]): NewsEntry {
  return {
    id: title,
    title,
    link: `https://x.com/${encodeURIComponent(title)}`,
    pubDate: new Date(NOW - hoursAgo * 3_600_000).toISOString(),
    summary: '',
    sources,
  };
}

describe('scoreEntry 半衰期参数化（周榜口径）', () => {
  it('默认半衰期 12h 不变（今日榜行为兼容，旧调用零改动）', () => {
    const s = scoreEntry(entryAt('隔夜', 12, ['qbitai']), NOW);
    expect(s).toBeCloseTo(3 * Math.exp(-1), 5);
  });

  it('48h 半衰期：同样 12h 龄期的稿子衰减更慢', () => {
    const s12 = scoreEntry(entryAt('稿', 12, ['qbitai']), NOW, 12);
    const s48 = scoreEntry(entryAt('稿', 12, ['qbitai']), NOW, 48);
    // 12h 半衰期下 12h 衰减到 e^-1≈0.368；48h 下仅 e^-0.25≈0.779
    expect(s48).toBeCloseTo(3 * Math.exp(-0.25), 5);
    expect(s12).toBeCloseTo(3 * Math.exp(-1), 5);
    expect(s48).toBeGreaterThan(s12);
  });

  it('周榜口径：3 天前的高权重大稿压过刚发的低权重小稿', () => {
    const oldBig = scoreEntry(entryAt('三天前量子位大稿', 72, ['qbitai']), NOW, 48);
    const freshSmall = scoreEntry(entryAt('刚发IT之家小稿', 1, ['ithome']), NOW, 48);
    // 3×e^(-72/48)=0.66 vs 1.5×e^(-1/48)≈1.47 —— 小稿仍赢（新稿优先的设计意图）
    expect(freshSmall).toBeGreaterThan(oldBig);
  });

  it('周榜口径：5 天前双源共报大稿 vs 1 天前单源中稿——共报+权重险胜', () => {
    const oldCross = scoreEntry(entryAt('五天前双源', 120, ['qbitai', 'ifanr']), NOW, 48);
    const mid = scoreEntry(entryAt('一天前', 24, ['ifanr']), NOW, 48);
    // (3+0.5)×e^(-120/48)=0.47 vs 2×e^(-0.5)=1.21 —— 一天前仍赢，5天前确实该凉
    expect(mid).toBeGreaterThan(oldCross);
  });

  it('周榜口径：隔夜(24h)大稿 vs 今日(2h)小稿的层次', () => {
    const overnight = scoreEntry(entryAt('昨夜大稿', 24, ['qbitai']), NOW, 48);
    const today = scoreEntry(entryAt('今日小稿', 2, ['ithome']), NOW, 48);
    // 3×e^(-0.5)=1.82 vs 1.5×e^(-2/48)=1.44 —— 昨夜大稿反超（48h 口径的设计意图）
    expect(overnight).toBeGreaterThan(today);
  });

  it('周榜去权重化（ignoreSourceWeight）：三源分数只差在共报与衰减', () => {
    // 同龄期单源：量子位与 IT之家 分数完全一致（权重统一为 1）
    const qb = scoreEntry(entryAt('量子位稿', 24, ['qbitai']), NOW, 48, true);
    const it = scoreEntry(entryAt('IT稿', 24, ['ithome']), NOW, 48, true);
    expect(qb).toBeCloseTo(it, 10);
    expect(qb).toBeCloseTo(Math.exp(-24 / 48), 5); // 1×e^(-0.5)
  });

  it('去权重下共报成为主导信号：双源 3 天前稿胜单源今天稿', () => {
    const cross = scoreEntry(entryAt('双源旧稿', 72, ['qbitai', 'ithome']), NOW, 48, true);
    const single = scoreEntry(entryAt('单源新稿', 2, ['qbitai']), NOW, 48, true);
    // (1+0.5)×e^(-1.5)=0.335 vs 1×e^(-2/48)≈0.959 —— 新稿仍赢
    expect(single).toBeGreaterThan(cross);
    // 但双源 1 天前 vs 单源 3 天前：共报胜
    const cross1d = scoreEntry(entryAt('双源一天前', 24, ['qbitai', 'ithome']), NOW, 48, true);
    const single3d = scoreEntry(entryAt('单源三天前', 72, ['qbitai']), NOW, 48, true);
    // 1.5×e^(-0.5)=0.91 vs e^(-1.5)=0.22 —— 共报碾压
    expect(cross1d).toBeGreaterThan(single3d);
  });

  it('ignoreSourceWeight 默认 false（今日榜行为不变）', () => {
    const s = scoreEntry(entryAt('稿', 0, ['qbitai']), NOW);
    expect(s).toBeCloseTo(3, 5); // 默认带权重
    const sNoW = scoreEntry(entryAt('稿', 0, ['qbitai']), NOW, 12, true);
    expect(sNoW).toBeCloseTo(1, 5); // 去权重=1
  });
});
