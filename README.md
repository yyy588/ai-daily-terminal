# AI_DAILY_TERMINAL

每日 AI 要闻聚合 + 开源新锐榜 + 大模型选型工作台。GitHub Pages 静态部署，全站零客户端 JS。

## 站点结构

| 路由 | 内容 |
|---|---|
| `/` | 终端仪表盘：今日要闻 Top 10（多源加权混排）+ 日期条（任意历史日直达）+ 新锐雷达速览 + 竞技场速览 + RSS 订阅 |
| `/news/` | 日报流（按月锚点分组） |
| `/news/[date]/` | 单日全部条目（标题+摘要+原文链接，日期条选中态） |
| `/repos/` | GitHub 新锐榜：近 14 天创建、双通道查询（英文 topic + 中文关键词）、≥50 星、Top 20 |
| `/arena/` | 开发选型工作台：WebDev 五维代码榜（🏆综合/🧱全栈/🖥️前端/🧩HTML/🧩React）+ Agent 能力榜常驻 |
| `/rss.xml` | RSS 订阅源（每日一条汇总 item） |

## 数据管道

```
GitHub Actions（每日 北京 08:23 / 20:41 + push 触发）
 ├─ build + test（118 测试：纯函数管道 + 产物断言）
 ├─ fetch-news    三源 RSS：量子位(3)/爱范儿(2)/IT之家(1.5)
 │                → AI 关键词闸门（泛科技源）→ 链接归一化+标题去重
 │                → 热度分排序 = maxSourceWeight × e^(-age/12h) + 0.5×(共报-1)
 ├─ fetch-repos   GitHub Search API 三通道并发（topic:llm+ai / 大模型 / 智能体）
 ├─ fetch-arena   arena.ai 六榜 SSR 抓取（Cloudflare 失败沿用快照）
 └─ 数据提交回仓库（持久化，滚出 RSS 窗口不丢）
```

新闻保留 30 天滚动窗口；新锐榜/榜单为覆盖式每日快照（星数是活数据不合并历史）。

## 技术栈

- **Astro 5** 静态生成，零 JS 岛屿，全站 316KB
- **Vitest** 118 测试：数据管道纯函数（解析/去重/时区/打分/RSS 生成）+ 构建产物断言（布局对齐/CSS 契约/导航标签）
- **linkedom** SSR HTML/XML 解析；**undici ProxyAgent** 本地代理抓取 arena
- 关键防线：模板裸链接扫描测试（防 404 回归）、arena 布局契约测试（防对齐回归）

## 本地开发

```bash
pnpm install
pnpm fetch-news    # 抓三源新闻
pnpm fetch-repos   # 抓新锐榜
ARENA_PROXY=http://127.0.0.1:7897 pnpm fetch-arena   # 榜单（需代理，CI 直连）
pnpm build && pnpm test
pnpm dev           # http://localhost:4321/ai-daily-terminal/
```

## 数据源配置

- 新闻源 + 权重 + 闸门开关：`src/lib/feeds.config.ts`
- 新锐榜查询通道：`src/lib/repos.ts` 的 `RADAR_QUERIES`
- 榜单列表：`scripts/fetch-arena.ts` 的 `BOARDS`
- AI 关键词词表：`src/lib/filter.ts`

均改配置数组即可，管道代码不动。已停用源留档于配置注释（HN 英文门槛、机器之心 RSS 失效等）。

## 部署

GitHub Actions 自动：push 即部署。仓库 Settings → Pages → Source = GitHub Actions。
`astro.config.mjs` 的 `base` 按仓库名配置。
