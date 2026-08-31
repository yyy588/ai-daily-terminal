/** 入榜最低星数：低于此值的练手仓库过滤掉（可调） */
export const MIN_STARS = 50;

/** 榜单容量上限 */
export const MAX_REPOS = 20;

/**
 * 雷达查询通道。英文通道走 topic 标签，中文通道走关键词
 * （国人项目多不打 topic，description 中文才是主索引）。
 * 新增通道只需加一项，抓取层自动并发。
 */
export const RADAR_QUERIES: readonly string[] = [
  'topic:llm+topic:ai',
  '大模型',
  '智能体',
];

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
 * 单通道 Search API 响应 → 过滤后的 RepoEntry 列表（不截断）。
 * 过滤：< MIN_STARS、已归档。非法输入返回空。
 */
function parseChannel(response: unknown): RepoEntry[] {
  if (response === null || typeof response !== 'object') return [];
  const items = (response as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  return (items as SearchItem[])
    .filter(
      (item) =>
        typeof item.full_name === 'string' &&
        typeof item.html_url === 'string' &&
        typeof item.stargazers_count === 'number' &&
        typeof item.created_at === 'string' &&
        item.stargazers_count >= MIN_STARS &&
        item.archived !== true,
    )
    .map((item) => ({
      fullName: item.full_name as string,
      description:
        item.description === null || item.description === undefined ? '' : String(item.description),
      stars: item.stargazers_count as number,
      language:
        item.language === null || item.language === undefined ? 'DOC' : String(item.language),
      url: item.html_url as string,
      createdAt: item.created_at as string,
    }));
}

/**
 * 多通道合并：按 fullName 去重（后出现的星数覆盖），统一星数降序，截断 MAX_REPOS。
 * 单通道异常（null/空对象）不影响其余通道。
 */
export function mergeRadarChannels(responses: readonly unknown[]): ReposData {
  const byName = new Map<string, RepoEntry>();

  for (const channel of responses) {
    for (const repo of parseChannel(channel)) {
      byName.set(repo.fullName, repo);
    }
  }

  const repos = [...byName.values()]
    .sort((a, b) => b.stars - a.stars)
    .slice(0, MAX_REPOS);

  return { generatedAt: '', repos };
}

/**
 * 兼容旧签名：单通道响应 → 榜单。
 * （等价于 mergeRadarChannels([response])，保留给既有测试与调用方。）
 */
export function buildRepoRadar(response: unknown): ReposData {
  return mergeRadarChannels([response]);
}

/** 供 site.ts 使用的空数据兜底 */
export function emptyReposData(): ReposData {
  return { generatedAt: '', repos: [] };
}

/**
 * 查询词编码：保留 GitHub 搜索语法字符（+ : >），只编码空格与非 ASCII。
 * 不能用 encodeURIComponent 全量编码——它会把 topic 分隔符 + 编成 %2B，
 * GitHub 当成字面加号，topic:llm+topic:ai 会返回 0 结果（实测回归）。
 */
export function encodeQuery(query: string): string {
  return query.replace(/ /g, '%20').replace(/[^\x20-\x7E]/g, (ch) => encodeURIComponent(ch));
}

/** 构造 Search API 通道 URL */
export function channelUrl(query: string, created: string, perPage: number): string {
  return `https://api.github.com/search/repositories?q=${encodeQuery(`${query} created:>${created}`)}&sort=stars&order=desc&per_page=${perPage}`;
}
