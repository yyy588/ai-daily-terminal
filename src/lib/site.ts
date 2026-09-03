import newsJson from '../data/news.json';
import reposJson from '../data/repos.json';
import arenaJson from '../data/arena.json';
import type { NewsData } from './types';
import { emptyReposData, type ReposData } from './repos';
import { emptyArenaData, type ArenaData } from './arena';

/** 构建时读取 news.json（fetch-news 脚本的产物）；文件带结构即用，异常兜底空结构 */
export function loadSiteData(): NewsData {
  const data = newsJson as NewsData;
  if (data && Array.isArray(data.digests)) return data;
  return { generatedAt: '', digests: [] };
}

/** 构建时读取 repos.json（fetch-repos 脚本的产物，覆盖式快照） */
export function loadReposData(): ReposData {
  const data = reposJson as ReposData;
  if (data && Array.isArray(data.repos)) return data;
  return emptyReposData();
}

/** 构建时读取 arena.json（fetch-arena 脚本的产物，双榜快照） */
export function loadArenaData(): ArenaData {
  const data = arenaJson as ArenaData;
  if (data && Array.isArray(data.boards) && data.boards.length > 0) return data;
  return emptyArenaData();
}

/** 站点展示名映射：sourceId → 展示名 */
export const SOURCE_NAMES: Record<string, string> = {
  qbitai: '量子位',
  hackernews: 'HackerNews',
  ifanr: '爱范儿',
  ithome: 'IT之家',
  jiqizhixin: '机器之心',
};
