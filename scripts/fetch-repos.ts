/**
 * 每日新锐榜抓取入口（多通道：英文 topic + 中文关键词）。
 * 通道并发抓取；任一通道失败仅告警，全部失败才沿用上次快照。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  channelUrl,
  mergeRadarChannels,
  RADAR_QUERIES,
  MIN_STARS,
  MAX_REPOS,
  type ReposData,
} from '../src/lib/repos';

const DATA_FILE = path.resolve(import.meta.dirname, '../src/data/repos.json');

const LOOKBACK_DAYS = 14;
const FETCH_TIMEOUT_MS = 20_000;

/** 滚动 7 天窗口的起始日期（YYYY-MM-DD） */
function windowStart(now = new Date()): string {
  return new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);
}

async function fetchChannel(query: string, created: string): Promise<unknown | null> {
  try {
    const res = await fetch(channelUrl(query, created, MAX_REPOS), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ai-daily-terminal/0.1',
      },
    });
    if (!res.ok) {
      console.warn(`// RADAR 通道「${query}」HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as unknown;
  } catch (err) {
    console.warn(`// RADAR 通道「${query}」失败: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function main(): Promise<void> {
  const created = windowStart();
  console.log(
    `// RADAR: ${RADAR_QUERIES.length} 通道（近 ${LOOKBACK_DAYS} 天，门槛 ${MIN_STARS} 星，上限 ${MAX_REPOS}）`,
  );

  const responses = await Promise.all(
    RADAR_QUERIES.map((query) => fetchChannel(query, created)),
  );

  const okCount = responses.filter((r) => r !== null).length;
  if (okCount === 0) {
    const previous = await load();
    console.warn(
      `// RADAR 全通道失败，沿用上次快照（${previous ? previous.repos.length + ' 个仓库' : '无历史数据'}）`,
    );
    return;
  }

  const radar: ReposData = {
    ...mergeRadarChannels(responses),
    generatedAt: new Date().toISOString(),
  };

  await save(radar);
  console.log(`// RADAR 完成: ${okCount}/${RADAR_QUERIES.length} 通道，${radar.repos.length} 个仓库 → ${DATA_FILE}`);
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

