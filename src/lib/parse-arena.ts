import { DOMParser } from 'linkedom';

/**
 * LMArena (arena.ai) SSR 榜单页 HTML → 结构化榜单行。
 * 页面为 Cloudflare 后面的服务端渲染表格；数据被抓取层存为快照。
 * 解析失败返回空数组（调用方沿用上次快照）。
 *
 * 锚点策略（2026-09 实测页面结构）：
 * - 模型名：<span title="模型名"> 的 title 属性（比混排单元格文本稳定）
 * - 厂商·许可：class 含 text-text-secondary 的 span，文本形如 "Anthropic · Proprietary"
 * - 分数：3-4 位数字 span，紧随其后是 ±CI（如 +23/-23）
 * - 票数：千分位逗号格式 span
 * 行聚合：以上锚点都挂在同一个 <tr> 内，按 tr 遍历聚合。
 */

/** 榜单单行 */
export interface ArenaRow {
  /** 页内顺序生成的名次（1 起） */
  readonly rank: number;
  readonly modelName: string;
  /** Arena 分数（如 1765） */
  readonly score: number;
  /** 置信区间原文（如 +23/-23） */
  readonly ci: string;
  /** 投票数 */
  readonly votes: number;
  /** 厂商（如 Anthropic） */
  readonly organization: string;
  /** 许可证原文（如 Proprietary / MIT / Apache 2.0） */
  readonly license: string;
  /** 非闭源即视为开源侧 */
  readonly isOpenSource: boolean;
}

const CLOSED_LICENSES = new Set(['proprietary']);

export function parseArenaTable(html: string): ArenaRow[] {
  const rows = parseRows(html);
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

interface ElementLike {
  getAttribute(name: string): string | null;
  getElementsByTagName(tag: string): ElementLike[] & { length: number };
  textContent: string | null;
}

function parseRows(html: string): Omit<ArenaRow, 'rank'>[] {
  let doc: ElementLike | null = null;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html') as unknown as ElementLike;
  } catch {
    return [];
  }
  if (doc === null) return [];

  const trs = Array.from(doc.getElementsByTagName('tr')) as unknown as ElementLike[];
  const out: Omit<ArenaRow, 'rank'>[] = [];

  for (const tr of trs) {
    const spans = Array.from(tr.getElementsByTagName('span')) as unknown as ElementLike[];
    if (spans.length === 0) continue;

    // 模型名锚点
    const modelSpan = spans.find((s) => {
      const title = s.getAttribute('title');
      return title !== null && title.trim() !== '' && !/^\d+$/.test(title.trim());
    });
    if (modelSpan === undefined) continue;
    const modelName = (modelSpan.getAttribute('title') ?? '').trim();

    // 厂商·许可锚点
    const orgSpan = spans.find(
      (s) => (s.textContent ?? '').includes('·') && (s.textContent ?? '').trim().length < 60,
    );
    const orgCell = orgSpan?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const orgMatch = orgCell.match(/^([A-Za-z][A-Za-z0-9 .&]*)\s·\s(.+)$/);
    if (orgMatch === null) continue;
    const organization = orgMatch[1].trim();
    const license = orgMatch[2].trim();

    // 分数 + CI：纯文本 span
    const texts = spans
      .map((s) => (s.textContent ?? '').trim())
      .filter((t) => t !== '');
    const scoreText = texts.find((t) => /^\d{3,4}$/.test(t));
    if (scoreText === undefined) continue;
    const score = Number(scoreText);

    const ci =
      texts.find((t) => /^[+\-]\d+\/[+\-]\d+$/.test(t)) ?? '';

    // 票数：优先千分位格式；无千分位时要求 ≥4 位（名次/spread 是 1-3 位，避开误配）
    const votesText =
      texts.find((t) => /^\d{1,3}(,\d{3})+$/.test(t)) ??
      texts.find((t) => /^\d{4,6}$/.test(t) && t !== scoreText);
    const votes = votesText !== undefined ? Number(votesText.replace(/,/g, '')) : 0;

    out.push({
      modelName,
      score,
      ci,
      votes,
      organization,
      license,
      isOpenSource: !CLOSED_LICENSES.has(license.toLowerCase()),
    });
  }
  return out;
}
