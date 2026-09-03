import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArenaTable } from '@lib/parse-arena';

const fixtureDir = path.resolve(__dirname, 'fixtures');
const webdevHtml = readFileSync(path.join(fixtureDir, 'arena-webdev.html'), 'utf-8');

describe('parseArenaTable × 价格列提取（$/M tokens）', () => {
  it('提取 "$10 / $50" 形态的输入/输出价格', () => {
    const [top] = parseArenaTable(webdevHtml);

    expect(top.price).toBe('$10 / $50');
  });

  it('提取 kimi 行价格（$3 / $15 形态）', () => {
    const rows = parseArenaTable(webdevHtml);
    const kimi = rows.find((r) => r.modelName === 'kimi-k3-max');

    expect(kimi?.price).toBe('$3 / $15');
  });

  it('价格不影响既有字段解析', () => {
    const [top] = parseArenaTable(webdevHtml);

    expect(top.modelName).toBe('claude-fable-5.1-max');
    expect(top.score).toBe(1765);
    expect(top.votes).toBe(1106);
  });
});
