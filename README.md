# AI_DAILY_TERMINAL

赛博朋克 HUD 风格的每日 AI 要闻静态站。参考 [hex2077.dev](https://hex2077.dev/) 视觉语言。

## 架构

```
GitHub Actions（cron 每日 08:00 北京时间 + push）
 └─ pnpm fetch-news   抓 RSS → 去重合并 → src/data/news.json（保留 30 天滚动窗口）
 └─ pnpm test         Vitest（28 个测试：解析/去重/时区/分组/合并）
 └─ pnpm build        Astro 静态构建（零客户端 JS）
 └─ deploy-pages      推到 GitHub Pages
```

## 页面

| 路由 | 内容 |
|---|---|
| `/` | HUD 状态条 + 今日要闻 Top 10 + 存档入口 |
| `/news/` | 日报卡片流（按月锚点分组） |
| `/news/[date]/` | 单日全部条目（标题 + 摘要 + 原文链接 + 前后日导航） |

## 数据源

`src/lib/feeds.config.ts` 管理。当前：

- **量子位** `qbitai.com/feed` ✅
- 机器之心 `/rss` ❌ 已失效（反爬 HTML），配置中 `enabled: false` 留档

新增源：加一项配置 + `tests/fixtures/` 补样本即可，管道代码不动。

## 本地开发

```bash
pnpm install
pnpm fetch-news   # 抓一次真实数据
pnpm dev          # 本地预览
pnpm test         # 跑测试
```

## 部署注意

`astro.config.mjs` 里 `base: '/ai-daily-terminal/'` 按仓库名配置。
若部署到 `<username>.github.io` 根仓库，把 `base` 改为 `'/'`。
仓库 Settings → Pages → Source 选 **GitHub Actions**。
