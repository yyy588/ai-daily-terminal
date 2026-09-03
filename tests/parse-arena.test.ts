import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArenaTable } from '@lib/parse-arena';

const fixtureDir = path.resolve(__dirname, 'fixtures');
const webdevHtml = readFileSync(path.join(fixtureDir, 'arena-webdev.html'), 'utf-8');

describe('parseArenaTable × SSR HTML', () => {
  it('提取表头外的数据行，按页内顺序返回', () => {
    const rows = parseArenaTable(webdevHtml);

    // fixture 含表头行 + 4 个完整模型行（第 5 行被裁切不完整，解析器应跳过）
    expect(rows.length).toBe(4);
    expect(rows[0].modelName).toBe('claude-fable-5.1-max');
    expect(rows[1].modelName).toBe('qwen3.8-max-0902');
  });

  it('解析分数、置信区间、厂商与开源标记', () => {
    const [top] = parseArenaTable(webdevHtml);

    expect(top.score).toBe(1765);
    expect(top.ci).toBe('+23/-23');
    expect(top.organization).toBe('Anthropic');
    expect(top.license).toBe('Proprietary');
  });

  it('开源标记由 license 推导（Proprietary=false，MIT/Apache=true）', () => {
    const rows = parseArenaTable(webdevHtml);
    // fixture 第4行 Moonshot · Kimi K3 license → 非标准 Proprietary 视为开源侧
    expect(rows[0].isOpenSource).toBe(false);
  });

  it('排名按返回顺序生成（1 起）', () => {
    const rows = parseArenaTable(webdevHtml);
    expect(rows[0].rank).toBe(1);
    expect(rows[3].rank).toBe(4);
  });

  it('空 HTML / 非表格内容返回空数组不抛异常', () => {
    expect(parseArenaTable('')).toEqual([]);
    expect(parseArenaTable('<html><body>no table</body></html>')).toEqual([]);
    expect(parseArenaTable('<table><tr><td>空</td></tr></table>')).toEqual([]);
  });

  it('票数字段提取', () => {
    const [top] = parseArenaTable(webdevHtml);
    expect(top.votes).toBe(1106);
  });
});
