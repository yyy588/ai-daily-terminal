import type { NewsData } from './types';

/** 入榜最低星数：低于此值的练手仓库过滤掉（可调） */
export const MIN_STARS = 50;

/** 榜单容量上限 */
export const MAX_REPOS = 20;

/** 新锐榜条目：GitHub 仓库快照 */
export interface RepoEntry {
  /** owner/name */
  readonly fullName: string;
  /** 简介，无则空串 */
  readonly description: string;
  /** 当前星数 */
  readonly stars: number;
  /** 主语言；null（纯文档仓库）映射为 DOC */
  readonly language: string;
  /** 仓库地址 */
  readonly url: string;
  /** 仓库创建时间，ISO 8601 */
  readonly createdAt: string;
}

/** repos.json 根结构（覆盖式每日快照，无历史合并） */
export interface ReposData {
  readonly generatedAt: string;
  readonly repos: readonly RepoEntry[];
}

/** GitHub Search API 响应的 items 元素（只声明用到的字段） */
interface SearchItem {
  readonly full_name?: unknown;
  readonly html_url?: unknown;
  readonly stargazers_count?: unknown;
  readonly language?: unknown | null;
  readonly description?: unknown | null;
  readonly created_at?: unknown;
  readonly archived?: unknown;
}

/**
 * Search API 响应 → 新锐榜。
 * 过滤：< MIN_STARS、已归档；排序：星数降序；截断：MAX_REPOS。
 * 非法输入/空结果返回空榜，不抛异常（抓取层负责降级）。
 */
export function buildRepoRadar(response: unknown): ReposData {
  const items = extractItems(response);

  const repos = items
    .filter(isValidItem)
    .filter((item) => Number(item.stargazers_count) >= MIN_STARS && item.archived !== true)
    .map(
      (item): RepoEntry => ({
        fullName: String(item.full_name),
        description: item.description === null || item.description === undefined ? '' : String(item.description),
        stars: Number(item.stargazers_count),
        language: item.language === null || item.language === undefined ? 'DOC' : String(item.language),
        url: String(item.html_url),
        createdAt: String(item.created_at),
      }),
    )
    .sort((a, b) => b.stars - a.stars)
    .slice(0, MAX_REPOS);

  return { generatedAt: '', repos };
}

function extractItems(response: unknown): SearchItem[] {
  if (response === null || typeof response !== 'object') return [];
  const items = (response as { items?: unknown }).items;
  return Array.isArray(items) ? (items as SearchItem[]) : [];
}

function isValidItem(item: SearchItem): boolean {
  return (
    typeof item.full_name === 'string' &&
    typeof item.html_url === 'string' &&
    typeof item.stargazers_count === 'number' &&
    typeof item.created_at === 'string'
  );
}

/** 供 site.ts 使用的空数据兜底 */
export function emptyReposData(): ReposData {
  return { generatedAt: '', repos: [] };
}

// 引用 NewsData 以保持与新闻域的类型对齐（两域结构独立，演化互不干扰）
export type { NewsData };
