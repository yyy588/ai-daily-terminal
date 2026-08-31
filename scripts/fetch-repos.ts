/**
 * 每日新锐榜抓取入口。GitHub Search API（匿名，10 req/min 限额，每日 1 次绰绰有余）。
 * 失败降级：保留昨日 repos.json，退出码 0（站点照常构建）。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildRepoRadar, type ReposData, MIN_STARS, MAX_REPOS } from '../src/lib/repos';

const DATA_FILE = path.resolve(import.meta.dirname, '../src/data/repos.json');

const SEARCH_URL = 'https://api.github.com/search/repositories';
const TOPICS = 'topic:llm+topic:ai';
const LOOKBACK_DAYS = 7;
const FETCH_TIMEOUT_MS = 20_000;

/** 滚动 7 天窗口的起始日期（YYYY-MM-DD） */
function windowStart(now = new Date()): string {
  return new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const created = windowStart();
  const url = `${SEARCH_URL}?q=${TOPICS}+created:>${created}&sort=stars&order=desc&per_page=${MAX_REPOS}`;
  console.log(`// RADAR: 抓取近 ${LOOKBACK_DAYS} 天新锐（窗口起点 ${created}，门槛 ${MIN_STARS} 星）`);

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ai-daily-terminal/0.1',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json: unknown = await res.json();
    const radar = { ...buildRepoRadar(json), generatedAt: new Date().toISOString() };

    await save(radar);
    console.log(`// RADAR 完成: ${radar.repos.length} 个仓库 → ${DATA_FILE}`);
  } catch (err) {
    // 降级：读旧数据，仅为打日志；无旧文件也静默通过
    const previous = await load();
    console.warn(
      `// RADAR 抓取失败（${err instanceof Error ? err.message : String(err)}），` +
        `沿用上次快照（${previous ? previous.repos.length + ' 个仓库' : '无历史数据'}）`,
    );
  }
}

async function load(): Promise<ReposData | null> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf-8')) as ReposData;
  } catch {
    return null;
  }
}

async function save(data: ReposData): Promise<void> {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

main().catch((err) => {
  console.error('// FATAL:', err);
  process.exit(1);
});
