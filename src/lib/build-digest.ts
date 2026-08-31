import type { DailyDigest, NewsEntry } from './types';
import { toBeijingDate } from './digest';

/** 每天日报的条目上限，防止异常源刷屏 */
export const MAX_ENTRIES_PER_DAY = 40;

/**
 * 去重后的条目 → 按北京时间日期分组的日报列表（日期倒序）。
 * 组内按发布时间倒序；无法解析时间的条目丢弃。
 */
export function buildDailyDigests(entries: readonly NewsEntry[]): DailyDigest[] {
  const byDate = new Map<string, NewsEntry[]>();

  for (const e of entries) {
    const date = toBeijingDate(e.pubDate);
    if (date === null) continue;

    const bucket = byDate.get(date);
    if (bucket === undefined) {
      byDate.set(date, [e]);
    } else {
      bucket.push(e);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0)) // 日期倒序（YYYY-MM-DD 字符串序即时间序）
    .map(([date, dayEntries]) => ({
      date,
      entries: [...dayEntries]
        .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
        .slice(0, MAX_ENTRIES_PER_DAY),
    }));
}
