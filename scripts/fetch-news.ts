/**
 * 每日数据抓取入口（GitHub Actions cron / 本地均可运行）。
 * 流程：抓 RSS → 与历史合并 → 落盘 src/data/news.json。
 * 单源失败仅告警不退出；全部失败才以非零码结束（避免白构建）。
 */
import path from 'node:path';
import { fetchAllFeeds, loadNewsData, mergeWithHistory, saveNewsData, RETENTION_DAYS } from '../src/lib/pipeline';
import { FEED_SOURCES } from '../src/lib/feeds.config';

const DATA_FILE = path.resolve(import.meta.dirname, '../src/data/news.json');

async function main(): Promise<void> {
  console.log('// UPLINK: 开始抓取', FEED_SOURCES.map((s) => s.name).join(' + '));

  const results = await fetchAllFeeds();
  const fresh = [];
  let failedCount = 0;
  const activeCount = results.length;

  for (const r of results) {
    if (r.ok) {
      console.log(`// FEED ${r.sourceId}: ${r.entries.length} 条`);
      fresh.push(...r.entries);
    } else {
      failedCount += 1;
      console.warn(`// FEED ${r.sourceId} 失败: ${r.error}`);
    }
  }

  if (activeCount > 0 && failedCount === activeCount) {
    console.error('// ABORT: 全部源失败，保留旧数据退出');
    process.exit(1);
  }

  const history = await loadNewsData(DATA_FILE);
  const merged = mergeWithHistory(fresh, history, RETENTION_DAYS);
  await saveNewsData(DATA_FILE, merged);

  const total = merged.digests.reduce((n, d) => n + d.entries.length, 0);
  console.log(`// SYNC 完成: ${merged.digests.length} 天 / ${total} 条 → ${DATA_FILE}`);
}

main().catch((err) => {
  console.error('// FATAL:', err);
  process.exit(1);
});
