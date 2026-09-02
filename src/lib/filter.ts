import type { RawEntry } from './types';
import { FEED_SOURCES } from './feeds.config';

/**
 * AI 关键词闸门：泛科技源（IT之家/爱范儿）的标题必须命中词表才入库。
 * 仅匹配标题（编辑意图所在），不扫摘要（防"本文含 AI 观点"式误命中）。
 * 垂直 AI 源（filterByKeywords=false）豁免，全量信任。
 */

/** 词表即编辑方针的数据化。加词=加一行。 */
const AI_KEYWORDS: readonly string[] = [
  'ai',
  '人工智能',
  '大模型',
  'gpt',
  'llm',
  '智能体',
  'agent',
  'openai',
  'anthropic',
  'claude',
  'gemini',
  'deepseek',
  'sora',
  '文心',
  '通义',
  '豆包',
  'kimi',
  'grok',
  '机器学习',
  '深度学习',
  '神经网络',
  'aigc',
  'copilot',
  '英伟达',
  'nvidia',
  '算力',
];

/** 标题是否命中 AI 词表（大小写不敏感） */
export function matchesAiKeywords(title: string): boolean {
  const lower = title.toLowerCase();
  return AI_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * 管道入口过滤：按各源配置的 filterByKeywords 开关分流。
 * 未配置的源默认过滤（新增泛科技源零配置防噪音）；垂直源显式声明 false 豁免。
 */
export function filterEntries(entries: readonly RawEntry[]): RawEntry[] {
  const exemptSources = new Set(
    FEED_SOURCES.filter((s) => s.filterByKeywords === false).map((s) => s.id),
  );
  return entries.filter((e) => exemptSources.has(e.sourceId) || matchesAiKeywords(e.title));
}
