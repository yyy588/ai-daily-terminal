import type { NewsEntry, RawEntry } from './types';

/** 北京时区偏移（分钟） */
const BJ_TZ_OFFSET_MIN = -8 * 60;

/**
 * RFC822 / ISO 时间 → 北京时间日期串（YYYY-MM-DD）。
 * 无法解析返回 null（调用方丢弃该条目）。
 */
export function toBeijingDate(pubDate: string): string | null {
  const ts = Date.parse(pubDate);
  if (Number.isNaN(ts)) return null;

  // 用 UTC+8 的"本地时间"格式化，避免依赖运行环境时区
  const bj = new Date(ts - BJ_TZ_OFFSET_MIN * 60_000);
  const y = bj.getUTCFullYear();
  const m = String(bj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(bj.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 去重合并：链接归一化（去 utm 等跟踪参数）为第一优先级，
 * 标题相似度（忽略空白差异）为第二优先级。
 * 重复条目合并来源标记，保留先出现者的摘要。
 */
export function dedupeEntries(raw: readonly RawEntry[]): NewsEntry[] {
  const byNormLink = new Map<string, number>(); // normLink → result index
  const byNormTitle = new Map<string, number>();

  const result: NewsEntry[] = [];

  for (const e of raw) {
    const summary = cleanSummary(e.description);

    const linkKey = normalizeLink(e.link);
    const linkIdx = byNormLink.get(linkKey);
    if (linkIdx !== undefined) {
      mergeSource(result, linkIdx, e.sourceId);
      continue;
    }

    const titleKey = normalizeTitle(e.title);
    const titleIdx = byNormTitle.get(titleKey);
    if (titleIdx !== undefined) {
      mergeSource(result, titleIdx, e.sourceId);
      // 标题重复但链接不同：也登记链接，后续同链接条目直接并入
      byNormLink.set(linkKey, titleIdx);
      continue;
    }

    const idx = result.length;
    result.push({
      id: linkKey,
      title: e.title,
      link: e.link,
      pubDate: e.pubDate,
      summary,
      sources: [e.sourceId],
    });
    byNormLink.set(linkKey, idx);
    byNormTitle.set(titleKey, idx);
  }

  return result;
}

function mergeSource(entries: NewsEntry[], idx: number, sourceId: string): void {
  const existing = entries[idx];
  if (existing.sources.includes(sourceId)) return;
  entries[idx] = { ...existing, sources: [...existing.sources, sourceId] };
}

/** 去掉跟踪参数（utm_*、ref 等），保留语义参数 */
function normalizeLink(link: string): string {
  try {
    const u = new URL(link);
    const drop = [...u.searchParams.keys()].filter(
      (k) => k.startsWith('utm_') || k === 'ref' || k === 'source' || k === 'from',
    );
    for (const k of drop) u.searchParams.delete(k);
    u.hash = '';
    // 去掉末尾斜杠差异
    return u.toString().replace(/\/$/, '');
  } catch {
    return link;
  }
}

/** 去空白 + 转小写，用于标题相似度初判 */
function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, '').toLowerCase();
}

/** 摘要清洗：去 HTML 标签、实体解码、压缩空白，截断到 120 字 */
export function cleanSummary(description?: string): string {
  if (!description) return '';
  const text = description
    .replace(/<[^>]*>/g, '') // HTML 标签
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}
