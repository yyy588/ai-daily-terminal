import type { NewsEntry } from './types';
import { FEED_SOURCES } from './feeds.config';

/**
 * 首页热度分（构建时算好，页面零 JS）：
 *
 *   score = maxSourceWeight × e^(-ageHours / HALF_LIFE_H)  +  CROSS_BONUS × (共报源数 - 1)
 *
 * - 来源权重：垂直 AI 源 > 泛科技源（编辑信任度的量化）
 * - 时间衰减：12h 半衰期，隔夜稿自然让位，但高权重大稿仍可压住低权重新稿
 * - 共报加成：多源同报 = 编辑部共识 = 重要性信号
 * 只作用于首页 Top 10；日报详情页保持纯时间序（档案要的是时间线）。
 */

/** 时间衰减半衰期（小时） */
export const HALF_LIFE_H = 12;

/** 每个额外共报源的加成 */
export const CROSS_BONUS = 0.5;

/** 未配置权重的源的默认权重 */
const DEFAULT_WEIGHT = 1;

/** sourceId → 权重表（构建时从配置拍平） */
const WEIGHTS: ReadonlyMap<string, number> = new Map(
  FEED_SOURCES.map((s) => [s.id, s.weight ?? DEFAULT_WEIGHT]),
);

/** 带分数的条目（模板消费） */
export type ScoredEntry = NewsEntry & { readonly score: number };

/** 单条打分。now 参数化保证可测试。 */
export function scoreEntry(entry: NewsEntry, now: number): number {
  const maxWeight = Math.max(
    ...entry.sources.map((id) => WEIGHTS.get(id) ?? DEFAULT_WEIGHT),
  );

  const ageHours = Math.max(0, (now - Date.parse(entry.pubDate)) / 3_600_000);
  const decay = Math.exp(-ageHours / HALF_LIFE_H);

  return maxWeight * decay + CROSS_BONUS * (entry.sources.length - 1);
}

/** 按分数降序排序（稳定），返回带 score 字段的新数组，不修改入参。 */
export function sortByScore(entries: readonly NewsEntry[], now: number): ScoredEntry[] {
  return entries
    .map((entry) => ({ ...entry, score: scoreEntry(entry, now) }))
    .sort((a, b) => b.score - a.score);
}
