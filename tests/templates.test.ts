import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/** 递归收集 .astro 模板文件 */
function collectAstroFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...collectAstroFiles(full));
    } else if (name.endsWith('.astro')) {
      out.push(full);
    }
  }
  return out;
}

const pagesDir = path.resolve(__dirname, '../src');

describe('模板内链回归测试（404 防线）', () => {
  it('所有 .astro 模板中不得出现硬编码的 href="/..." 站内链接（必须经 internalHref 拼接 base）', () => {
    const offenders: string[] = [];

    for (const file of collectAstroFiles(pagesDir)) {
      const src = readFileSync(file, 'utf-8');
      // 匹配 href="/..." 但排除 href="/"（根路径同样需要前缀）与外链
      const bareHrefRe = /href="\/(?!\/)/g;
      let m: RegExpExecArray | null;
      while ((m = bareHrefRe.exec(src)) !== null) {
        offenders.push(`${path.relative(pagesDir, file)}: ${m[0]}...`);
      }
    }

    expect(offenders, `发现未拼接 base 的裸链接:\n${offenders.join('\n')}`).toEqual([]);
  });
});
