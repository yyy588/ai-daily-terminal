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

/** 榜单单行。Elo 榜（Chat/WebDev）用 score/ci/votes；Agent 榜用 netImprovement 等多指标字段 */
export interface ArenaRow {
  /** 页内顺序生成的名次（1 起） */
  readonly rank: number;
  readonly modelName: string;
  /** Arena 分数（如 1765）——Elo 榜字段 */
  readonly score: number;
  /** 置信区间原文（如 +23/-23）——Elo 榜字段 */
  readonly ci: string;
  /** 投票数——Elo 榜字段 */
  readonly votes: number;
  /** API 价格原文（如 "$10 / $50" = 输入/输出 $/M tokens）——Elo 榜字段 */
  readonly price?: string;
  /** 厂商（如 Anthropic） */
  readonly organization: string;
  /** 许可证原文（如 Proprietary / MIT / Apache 2.0） */
  readonly license: string;
  /** 非闭源即视为开源侧 */
  readonly isOpenSource: boolean;
  /* ---- Agent 榜多指标字段（其他榜为 undefined） ---- */
  /** 净改进率主指标（如 13.74 表示 13.74%） */
  readonly netImprovement?: number;
  /** 净改进率 CI 原文（如 ±1.80%） */
  readonly netImprovementCi?: string;
  /** 确认成功率（如 14.96 表示 14.96%） */
  readonly successRate?: number;
  /** 每任务成本原文（如 $2.47） */
  readonly costPerTask?: string;
  /** 会话数（样本量） */
  readonly sessions?: number;
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

    // API 价格：行内 "$x / $y" 合并文本（HTML 注释分隔符在 textContent 中消失）
    const price = texts.find((t) => /^\$\d+(\.\d+)?\s\/\s\$\d+(\.\d+)?$/.test(t));

    out.push({
      modelName,
      score,
      ci,
      votes,
      price,
      organization,
      license,
      isOpenSource: !CLOSED_LICENSES.has(license.toLowerCase()),
    });
  }
  return out;
}

/**
 * Agent 榜（arena.ai/leaderboard/agent）专用解析。
 * 12 列 td 结构（2026-09 实测）：
 * [0]=名次+spread [1]=模型（span[title] 锚点）
 * [2]=Net Improvement±CI [3]=Confirmed Success±CI [4..7]=其余四指标
 * [8]=Sessions（千分位） [9]=Cost/Task（$x.xx） [10]=..K [11]=价格
 */
export function parseArenaAgent(html: string): ArenaRow[] {
  let doc: ElementLike | null = null;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html') as unknown as ElementLike;
  } catch {
    return [];
  }
  if (doc === null) return [];

  const trs = Array.from(doc.getElementsByTagName('tr')) as unknown as ElementLike[];
  const out: ArenaRow[] = [];

  for (const tr of trs) {
    const tds = Array.from(tr.getElementsByTagName('td')) as unknown as ElementLike[];
    if (tds.length < 10) continue; // 表头行（th）或异常行

    const modelSpan = (Array.from(tr.getElementsByTagName('span')) as unknown as ElementLike[]).find(
      (s) => {
        const title = s.getAttribute('title');
        return title !== null && title.trim() !== '' && !/^\d+$/.test(title.trim());
      },
    );
    if (modelSpan === undefined) continue;
    const modelName = (modelSpan.getAttribute('title') ?? '').trim();

    // 厂商·许可：模型单元格内 "Anthropic · Proprietary" 文本
    const modelCellText = (tds[1]?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const orgMatch = modelCellText.match(/([A-Za-z][A-Za-z0-9 .&]*)\s·\s(.+)$/);
    if (orgMatch === null) continue;
    const organization = orgMatch[1].trim();
    const license = orgMatch[2].trim();

    // 多指标：值±CI 同格（如 "13.74%±1.80%"）
    const metric = (td: ElementLike | undefined): { value: number; ci: string } | null => {
      const text = (td?.textContent ?? '').replace(/\s+/g, '');
      const m = text.match(/^(\d+(?:\.\d+)?)%(±[\d.]+%)?$/);
      return m === null ? null : { value: Number(m[1]), ci: m[2] ?? '' };
    };

    const net = metric(tds[2]);
    if (net === null) continue;
    const success = metric(tds[3]);

    const sessionsText = (tds[8]?.textContent ?? '').replace(/[,\s]/g, '');
    const sessions = /^\d+$/.test(sessionsText) ? Number(sessionsText) : undefined;
    const costPerTask = (tds[9]?.textContent ?? '').replace(/\s+/g, '') || undefined;

    out.push({
      rank: out.length + 1,
      modelName,
      score: 0,
      ci: '',
      votes: sessions ?? 0,
      organization,
      license,
      isOpenSource: !CLOSED_LICENSES.has(license.toLowerCase()),
      netImprovement: net.value,
      netImprovementCi: net.ci,
      successRate: success?.value,
      costPerTask,
      sessions,
    });
  }
  return out;
}
