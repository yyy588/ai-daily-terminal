import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArenaAgent } from '@lib/parse-arena';

const fixtureDir = path.resolve(__dirname, 'fixtures');
const agentHtml = readFileSync(path.join(fixtureDir, 'arena-agent.html'), 'utf-8');

describe('parseArenaAgent × Agent 榜 SSR HTML', () => {
  it('提取模型行（表头跳过），模型名带括号变体', () => {
    const rows = parseArenaAgent(agentHtml);

    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows[0].modelName).toBe('Claude Opus 5 (High)');
    expect(rows[1].modelName).toBe('Claude Opus 5 (Max)');
  });

  it('主指标：Net Improvement 分数与 CI', () => {
    const [top] = parseArenaAgent(agentHtml);

    expect(top.netImprovement).toBeCloseTo(13.74, 2);
    expect(top.netImprovementCi).toBe('±1.80%');
  });

  it('副指标：Confirmed Success / Cost per Task / Sessions', () => {
    const [top] = parseArenaAgent(agentHtml);

    expect(top.successRate).toBeCloseTo(14.96, 2);
    expect(top.costPerTask).toBe('$2.47');
    expect(top.sessions).toBe(21688); // 千分位 21,688 → 数字
  });

  it('厂商与许可照常提取，开源推导一致', () => {
    const [top] = parseArenaAgent(agentHtml);
    expect(top.organization).toBe('Anthropic');
    expect(top.license).toBe('Proprietary');
    expect(top.isOpenSource).toBe(false);
  });

  it('排名按行序生成', () => {
    const rows = parseArenaAgent(agentHtml);
    expect(rows[0].rank).toBe(1);
  });

  it('空/非表格输入返回空数组不抛异常', () => {
    expect(parseArenaAgent('')).toEqual([]);
    expect(parseArenaAgent('<html>no</html>')).toEqual([]);
  });
});
