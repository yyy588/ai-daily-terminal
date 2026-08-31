import type { FeedSource } from './types';

/**
 * RSS 源列表。新增源：加一项 + 在 tests/fixtures 补样本。
 * enabled=false 的源保留配置但不抓取（如目标站 RSS 失效/反爬时先禁用观察）。
 *
 * 实测记录（2026-08-31）：
 * - 量子位 www.qbitai.com/feed ✅ 稳定，WordPress 标准 RSS
 * - 机器之心 /rss ❌ 返回反爬 HTML 页，非 XML；.xml 后缀与 RSSHub 镜像均不可用
 * - IT之家 /rss/ ✅ 可用但为泛科技混合流（无 AI 分类标签），暂不启用
 */
export const FEED_SOURCES: readonly FeedSource[] = [
  {
    id: 'qbitai',
    name: '量子位',
    url: 'https://www.qbitai.com/feed',
  },
  {
    id: 'jiqizhixin',
    name: '机器之心',
    url: 'https://www.jiqizhixin.com/rss',
    // RSS 已失效（返回 HTML），禁用留档待替代源
    enabled: false,
  },
];
