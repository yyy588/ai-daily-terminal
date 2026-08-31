import newsJson from '../data/news.json';
import reposJson from '../data/repos.json';
import type { NewsData } from './types';
import { emptyReposData, type ReposData } from './repos';

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

/** 站点展示名映射：sourceId → 中文名 */
export const SOURCE_NAMES: Record<string, string> = {
  qbitai: '量子位',
  jiqizhixin: '机器之心',
};
