/**
 * LMArena 榜单抓取入口。
 * 双榜（WebDev Overall + Chat Overall），串行 2 秒间隔（礼貌抓取）。
 *
 * 两种运行模式：
 * - CI（GitHub Actions 海外机房）：直连尝试，Cloudflare 403 则沿用上次快照
 * - 本地：设 ARENA_PROXY=http://127.0.0.1:7897 走代理（本地直连基本必被拦）
 * 部分榜单失败时保留成功部分 + 沿用失败榜的旧快照。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
// Node 全局 fetch 不认 ProxyAgent dispatcher；代理模式必须用 undici 自己的 fetch
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { parseArenaTable, parseArenaAgent } from '../src/lib/parse-arena';
import type { ArenaBoard, ArenaData } from '../src/lib/arena';

const DATA_FILE = path.resolve(import.meta.dirname, '../src/data/arena.json');

const FETCH_TIMEOUT_MS = 25_000;
const INTER_BOARD_DELAY_MS = 2_000;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Node fetch 不读环境变量代理；显式构建 ProxyAgent
const PROXY = process.env.ARENA_PROXY ?? '';
const proxyAgent = PROXY !== '' ? new ProxyAgent(PROXY) : undefined;

/** 代理模式走 undici fetch（支持 dispatcher），直连走全局 fetch */
const doFetch: typeof fetch = (url, init) =>
  proxyAgent !== undefined
    ? (undiciFetch(url, { ...init, dispatcher: proxyAgent }) as unknown as Promise<Response>)
    : fetch(url, init);

/** 榜单配置：加榜只需加一行。kind 决定解析器（elo 表格 / agent 多指标） */
const BOARDS: readonly { id: string; title: string; url: string; kind: 'elo' | 'agent' }[] = [
  {
    id: 'webdev',
    title: 'Code · WebDev',
    url: 'https://arena.ai/leaderboard/code/webdev/overall',
    kind: 'elo',
  },
  {
    id: 'chat',
    title: 'Chat · Overall',
    url: 'https://arena.ai/leaderboard/text/overall',
    kind: 'elo',
  },
  {
    id: 'agent',
    title: 'Agent · 能力',
    url: 'https://arena.ai/leaderboard/agent',
    kind: 'agent',
  },
  {
    id: 'vision',
    title: 'Vision · 视觉理解',
    url: 'https://arena.ai/leaderboard/vision/overall',
    kind: 'elo',
  },
  {
    id: 'search',
    title: 'Search · AI 搜索',
    url: 'https://arena.ai/leaderboard/search/overall',
    kind: 'elo',
  },
  {
    id: 't2i',
    title: 'Text-to-Image · 文生图',
    url: 'https://arena.ai/leaderboard/text-to-image/overall',
    kind: 'elo',
  },
];

async function fetchBoard(
  url: string,
  kind: 'elo' | 'agent',
): Promise<ArenaBoard | null> {
  try {
    const res = await doFetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      console.warn(`// ARENA ${url} HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();
    const rows = kind === 'agent' ? parseArenaAgent(html) : parseArenaTable(html);
    if (rows.length === 0) {
      console.warn(`// ARENA ${url} 解析到 0 行（页面结构变化或拦截页）`);
      return null;
    }

    return { id: '', title: '', rows, fetchedAt: new Date().toISOString() };
  } catch (err) {
    console.warn(`// ARENA ${url} 失败: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function load(): Promise<ArenaData | null> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf-8')) as ArenaData;
  } catch {
    return null;
  }
}

async function save(data: ArenaData): Promise<void> {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const mode = PROXY !== '' ? `代理 ${PROXY}` : '直连';
  console.log(`// ARENA: 抓取 ${BOARDS.length} 张榜（${mode}）`);

  const previous = await load();
  const prevById = new Map((previous?.boards ?? []).map((b) => [b.id, b]));

  const results: ArenaBoard[] = [];
  for (const board of BOARDS) {
    const fetched = await fetchBoard(board.url, board.kind);
    if (fetched !== null) {
      results.push({ ...fetched, id: board.id, title: board.title });
      console.log(`// ARENA ${board.id}: ${fetched.rows.length} 行 ✓`);
    } else {
      // 沿用旧快照（若有）
      const old = prevById.get(board.id);
      if (old !== undefined) {
        results.push(old);
        console.log(`// ARENA ${board.id}: 沿用快照（${old.fetchedAt.slice(0, 10)}，${old.rows.length} 行）`);
      } else {
        console.warn(`// ARENA ${board.id}: 无旧快照，本榜缺席`);
      }
    }
    await sleep(INTER_BOARD_DELAY_MS);
  }

  if (results.length === 0) {
    console.warn('// ARENA 全部失败且无旧快照，保留现状退出');
    return;
  }

  await save({ boards: results });
  console.log(`// ARENA 完成: ${results.length}/${BOARDS.length} 榜 → ${DATA_FILE}`);
}

main().catch((err) => {
  console.error('// FATAL:', err);
  process.exit(1);
});
