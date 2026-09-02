import type { FeedSource } from './types';

/**
 * RSS 源列表。新增源：加一项 + 在 tests/fixtures 补样本。
 *
 * 字段速查：
 * - enabled=false         源失效留档观察（不抓取）
 * - weight                首页热度分权重：垂直 AI 源 3 / 半垂直 2 / 泛科技 1.5
 * - filterByKeywords      泛科技源必须 true（过 AI 词表闸门）；垂直源 false 豁免
 *
 * 实测记录（2026-09-02）：
 * - 量子位 qbitai.com/feed ✅ WordPress 标准 RSS，纯 AI 内容
 * - IT之家 ithome.com/rss ✅ 稳定，泛科技（手机/汽车为主，AI 稿约 25%，需过滤）
 * - 爱范儿 ifanr.com/feed ✅ 稳定，消费科技（AI 密度中等，需过滤）
 * - 机器之心 /rss ❌ 返回反爬 HTML（2026-08-31 起）
 * - Solidot ❌ RSS 只吐频道名不吐条目
 * - 36kr / aibase / 华尔街见闻 ❌ 反爬或死链
 */
export const FEED_SOURCES: readonly FeedSource[] = [
  {
    id: 'qbitai',
    name: '量子位',
    url: 'https://www.qbitai.com/feed',
    weight: 3,
    filterByKeywords: false,
  },
  {
    id: 'ifanr',
    name: '爱范儿',
    url: 'https://www.ifanr.com/feed',
    weight: 2,
    filterByKeywords: true,
  },
  {
    id: 'ithome',
    name: 'IT之家',
    url: 'https://www.ithome.com/rss/',
    weight: 1.5,
    filterByKeywords: true,
  },
  {
    id: 'jiqizhixin',
    name: '机器之心',
    url: 'https://www.jiqizhixin.com/rss',
    // RSS 已失效（返回 HTML），禁用留档待替代源
    enabled: false,
  },
];
