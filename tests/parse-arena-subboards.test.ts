import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArenaTable } from '@lib/parse-arena';

const fixtureDir = path.resolve(__dirname, 'fixtures');

function load(id: string): string {
  return readFileSync(path.join(fixtureDir, `arena-webdev-${id}.html`), 'utf-8');
}

describe('parseArenaTable × WebDev 分榜兼容', () => {
  it('fullstack 分榜：榜首 qwen3.8-max 1687（与综合榜排序不同）', () => {
    const rows = parseArenaTable(load('fullstack'));

    expect(rows[0]).toMatchObject({ modelName: 'qwen3.8-max', score: 1687, rank: 1 });
    expect(rows[1].modelName).toBe('claude-opus-5-max');
  });

  it('frontend 分榜：榜首 fable-5.1-max 1812（frontend 分数体系独立于 overall）', () => {
    const rows = parseArenaTable(load('frontend'));

    expect(rows[0]).toMatchObject({ modelName: 'claude-fable-5.1-max', score: 1812 });
  });

  it('html 分榜解析', () => {
    const rows = parseArenaTable(load('html'));

    expect(rows[0]).toMatchObject({ modelName: 'claude-fable-5.1-max', score: 1694 });
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('react 分榜解析', () => {
    const rows = parseArenaTable(load('react'));

    expect(rows[0]).toMatchObject({ modelName: 'claude-fable-5.1-max', score: 1827 });
  });

  it('各分榜都带价格列', () => {
    for (const id of ['fullstack', 'frontend', 'html', 'react']) {
      const [top] = parseArenaTable(load(id));
      expect(top.price, `${id} 榜首应有价格`).toMatch(/^\$\d+(\.\d+)? \/ \$\d+(\.\d+)?$/);
    }
  });
});
