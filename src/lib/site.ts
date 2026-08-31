import newsJson from '../data/news.json';
import type { NewsData } from './types';

/** 构建时读取 news.json（fetch-news 脚本的产物）；文件带结构即用，异常兜底空结构 */
export function loadSiteData(): NewsData {
  const data = newsJson as NewsData;
  if (data && Array.isArray(data.digests)) return data;
  return { generatedAt: '', digests: [] };
}

/** 站点展示名映射：sourceId → 中文名 */
export const SOURCE_NAMES: Record<string, string> = {
  qbitai: '量子位',
  jiqizhixin: '机器之心',
};
