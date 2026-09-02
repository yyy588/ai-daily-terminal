import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DailyDigest, FeedResult, NewsData, RawEntry } from './types';
import { FEED_SOURCES } from './feeds.config';
import { parseRss } from './parse-rss';
import { dedupeEntries } from './digest';
import { buildDailyDigests } from './build-digest';
import { filterEntries } from './filter';

/** 历史保留天数：rolling window，控制 news.json 体量 */
export const RETENTION_DAYS = 30;

/** 单源抓取超时（毫秒） */
const FETCH_TIMEOUT_MS = 20_000;

/**
 * 抓取全部启用源（并发）。单源失败不中断整体，返回 FeedResult 由调用方决定告警策略。
 */
export async function fetchAllFeeds(): Promise<FeedResult[]> {
  const active = FEED_SOURCES.filter((s) => s.enabled !== false);
  return Promise.all(active.map((source) => fetchFeed(source.url, source.id)));
}

async function fetchFeed(url: string, sourceId: string): Promise<FeedResult> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'ai-daily-terminal/0.1 (+https://github.com)' },
    });
    if (!res.ok) {
      return { ok: false, sourceId, error: `HTTP ${res.status}` };
    }
    const xml = await res.text();
    // 关键词闸门在抓取层执行：噪音不占滚动窗口体积
    return { ok: true, sourceId, entries: filterEntries(parseRss(xml, sourceId)) };
  } catch (err) {
    return { ok: false, sourceId, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * 核心合并：新抓条目 + 历史数据 → 新的 NewsData。
 * 纯函数（generatedAt 由参数传入，保证可测试性）。
 *
 * 流程：新旧条目全部丢进同一个去重器（链接归一化 + 标题相似），
 * 重新按日分组——历史里已存在的条目自然与新条目合并来源。
 */
export function mergeWithHistory(
  fresh: readonly RawEntry[],
  history: NewsData | null,
  retentionDays: number,
  nowIso: string = new Date().toISOString(),
): NewsData {
  const historyEntries = toRawEntries(history);
  const all = [...fresh, ...historyEntries];

  const digests = buildDailyDigests(dedupeEntries(all));
  return {
    generatedAt: nowIso,
    digests: digests.slice(0, retentionDays),
  };
}

/** 历史数据降级回 RawEntry 形态，与新抓条目走同一条清洗管道 */
function toRawEntries(history: NewsData | null): RawEntry[] {
  if (history === null) return [];
  return history.digests.flatMap((digest) =>
    digest.entries.map((entry) => ({
      title: entry.title,
      link: entry.link,
      pubDate: entry.pubDate,
      description: entry.summary,
      // 历史条目的 sources 展开成多条 RawEntry 以保留多源标记
      // （去重合并时相同 sourceId 不会重复计入）
      sourceId: entry.sources[0] ?? 'unknown',
    })),
  );
}

/** 读取 news.json；文件不存在或损坏返回 null（首次构建 / 自愈） */
export async function loadNewsData(filePath: string): Promise<NewsData | null> {
  try {
    const text = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(text) as NewsData;
    if (!Array.isArray(parsed.digests)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 落盘 news.json */
export async function saveNewsData(filePath: string, data: NewsData): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

/** 给脚本层用的类型守卫导出 */
export type { DailyDigest };
