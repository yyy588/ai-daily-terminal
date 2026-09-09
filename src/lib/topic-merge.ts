import type { NewsEntry } from './types';

/**
 * 跨源同题材合并 + 榜单源配额——周热榜的"热"信号基础设施。
 *
 * 背景：链接归一化/空格归一去重拦不住"三源各写各的同题材稿"
 * （标题写法完全不同），导致共报加成永远为 0、榜单被高产源刷屏。
 * 解法两层：
 * 1. mergeByTopic：标题字符 2-gram Jaccard 相似度 > 阈值 且 跨源 → 合并
 * 2. pickWithQuota：每（源, 北京日）组合在榜内最多 N 条（多样性配额）
 */

/** 合并的相似度阈值：实测中文科技标题同题材 ~0.5+，不同题材 <0.2 */
const SIMILARITY_THRESHOLD = 0.42;

/** 标题字符 2-gram 集合（去空白后滑窗） */
function bigrams(text: string): Set<string> {
  const cleaned = text.replace(/\s+/g, '');
  const set = new Set<string>();
  for (let i = 0; i < cleaned.length - 1; i++) {
    set.add(cleaned.slice(i, i + 2));
  }
  return set;
}

/** 2-gram Jaccard 相似度：|A∩B| / |A∪B| */
export function bigramSimilarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;

  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;

  return inter / (A.size + B.size - inter);
}

/**
 * 跨源同题材合并：遍历已去重条目，与已合并组比对——
 * 相似度超阈值且与该组不同源 → 并入（sources 聚合，保留先出现者标题）。
 * 同源相似不合并（防误吞同源系列稿，如"XX 系列报道（一）（二）"）。
 */
export function mergeByTopic(entries: readonly NewsEntry[]): NewsEntry[] {
  const groups: { entry: NewsEntry; sources: Set<string> }[] = [];

  for (const e of entries) {
    const src = e.sources[0] ?? 'unknown';
    let merged = false;

    for (const g of groups) {
      if (g.sources.has(src)) continue; // 同源不合并
      if (bigramSimilarity(g.entry.title, e.title) >= SIMILARITY_THRESHOLD) {
        g.sources.add(src);
        g.entry = {
          ...g.entry,
          sources: [...g.sources],
        };
        merged = true;
        break;
      }
    }

    if (!merged) {
      groups.push({ entry: { ...e }, sources: new Set(e.sources) });
    }
  }

  return groups.map((g) => g.entry);
}

/**
 * 榜单源配额：按分数降序遍历，每个（源, 北京日）组合最多 quota 条。
 * 被配额拦下的条目跳过，让位给后续他源条目——保榜单多样性。
 */
export const PER_SOURCE_DAILY_QUOTA = 2;

export function pickWithQuota(
  sorted: readonly {
    sources: readonly string[];
    pubDate: string;
    [k: string]: unknown;
  }[],
  limit: number,
  quota: number = PER_SOURCE_DAILY_QUOTA,
): typeof sorted[number][] {
  const count = new Map<string, number>();
  const picked: typeof sorted[number][] = [];

  for (const e of sorted) {
    if (picked.length >= limit) break;

    const day = new Date(Date.parse(e.pubDate) + 8 * 3600_000).toISOString().slice(0, 10);
    const key = `${e.sources[0] ?? 'unknown'}|${day}`;
    const used = count.get(key) ?? 0;

    if (used >= quota) continue; // 该源当日配额满，让位

    count.set(key, used + 1);
    picked.push(e);
  }

  return picked;
}
