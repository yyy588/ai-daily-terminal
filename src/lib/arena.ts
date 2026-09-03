import type { ArenaRow } from './parse-arena';

/** 单张榜单快照 */
export interface ArenaBoard {
  /** 榜单标识（webdev / chat） */
  readonly id: string;
  /** 榜单展示名（如 "Code · WebDev"） */
  readonly title: string;
  /** 完整解析行（展示层自行截断 Top N） */
  readonly rows: readonly ArenaRow[];
  /** 本快照抓取时间，ISO 8601 */
  readonly fetchedAt: string;
}

/** arena.json 根结构 */
export interface ArenaData {
  /** 各榜单按配置顺序 */
  readonly boards: readonly ArenaBoard[];
}

/** 抓取失败的兜底空结构 */
export function emptyArenaData(): ArenaData {
  return { boards: [] };
}
