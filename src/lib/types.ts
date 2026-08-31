/**
 * 数据管道核心类型。
 * 管道全程纯函数：RSS XML → RawEntry → NewsEntry → DailyDigest。
 */

/** RSS 源配置，新增源只需在 feeds.config.ts 加一项 */
export interface FeedSource {
  /** 站点名，展示用（如 "机器之心"） */
  readonly name: string;
  /** RSS 地址 */
  readonly url: string;
  /** 站点标识，用于来源标记与去重合并 */
  readonly id: string;
  /** false 时跳过抓取（源失效留档观察） */
  readonly enabled?: boolean;
}

/** RSS 解析后的原始条目（未清洗） */
export interface RawEntry {
  readonly title: string;
  readonly link: string;
  /** 发布时间，ISO 8601 */
  readonly pubDate: string;
  /** 摘要（可能含 HTML 标签，清洗后入库） */
  readonly description?: string;
  /** 来源站点 id */
  readonly sourceId: string;
}

/** 清洗后的新闻条目（入库最终形态） */
export interface NewsEntry {
  readonly id: string;
  readonly title: string;
  readonly link: string;
  /** ISO 8601，带时区偏移 */
  readonly pubDate: string;
  /** 纯文本摘要，≤120 字 */
  readonly summary: string;
  /** 所有报道过此条目的源 id（去重合并的结果） */
  readonly sources: readonly string[];
}

/** 一天的日报 */
export interface DailyDigest {
  /** 日期，格式 YYYY-MM-DD（北京时间） */
  readonly date: string;
  readonly entries: readonly NewsEntry[];
}

/** news.json 根结构 */
export interface NewsData {
  /** 数据生成时间，ISO 8601 */
  readonly generatedAt: string;
  /** 按日期倒序的日报列表 */
  readonly digests: readonly DailyDigest[];
}

/** 单源抓取结果：源挂掉返回 error，不中断其他源 */
export type FeedResult =
  | { readonly ok: true; readonly sourceId: string; readonly entries: readonly RawEntry[] }
  | { readonly ok: false; readonly sourceId: string; readonly error: string };
