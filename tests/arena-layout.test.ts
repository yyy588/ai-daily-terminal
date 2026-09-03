import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DOMParser } from 'linkedom';

/**
 * arena 页对齐回归测试。
 * 前置：npx astro build 已产出 dist/arena/index.html。
 * 若 dist 不存在（纯单测环境）跳过——CI 中 build 先于 test 或 test 后可手动跑。
 */
const page = path.resolve(__dirname, '../dist/arena/index.html');
const hasBuild = existsSync(page);

describe.runIf(hasBuild)('arena 页面布局对齐', () => {
  // 惰性读取：runIf(false) 时 describe 体不会执行，但保险起见仅在存在时读
  const html = hasBuild ? readFileSync(page, 'utf-8') : '';
  const doc = new DOMParser().parseFromString(html, 'text/html');

  it('两榜行内列结构一致：rank / model / score / price 四列一一对应', () => {
    const rows = Array.from(doc.querySelectorAll('.wrow'));
    expect(rows.length).toBeGreaterThanOrEqual(40); // 两榜各 20 行

    const colShapes = new Set(
      rows.map((r) =>
        Array.from(r.children)
          .map((c) => (c as Element).className.split(' ')[0])
          .join('|'),
      ),
    );
    // 所有行（含两榜）列结构必须同一形态，否则视觉错位
    expect(colShapes.size).toBe(1);
    expect([...colShapes][0]).toBe('wrow__rank|wrow__model|wrow__score|wrow__price');
  });

  it('两榜列表起点对齐：两列结构同构（都只含一个 board__pane，筛选条独占整行）', () => {
    const boards = Array.from(doc.querySelectorAll('.dev-boards > .board'));
    expect(boards).toHaveLength(2);

    const structures = boards.map((b) =>
      Array.from(b.children).map((c) => `${c.tagName}.${(c as Element).className.split(' ')[0]}`).join('>'),
    );
    // 两列内部结构必须完全一致（pane 内 title+list），标题与列表起点才对齐
    expect(structures[0]).toBe(structures[1]);
    expect(structures[0]).toBe('DIV.board__pane');
  });

  it('score 列：数字与 CI 分离（CI 在独立子元素，不与数字混排）', () => {
    const scores = Array.from(doc.querySelectorAll('.wrow__score'));
    expect(scores.length).toBeGreaterThanOrEqual(40);

    for (const s of scores) {
      const ci = s.querySelector('.wrow__ci');
      if (ci !== null) {
        // 有 CI 时：数字必须是独立 text node（不含 CI 文本）
        const directText = Array.from(s.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => (n.textContent ?? '').trim())
          .join('');
        expect(directText).toMatch(/^\d+(\.\d+)?%?$/);
        expect(ci.textContent ?? '').toMatch(/^[+±]/);
      }
    }
  });
});
