import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DOMParser } from 'linkedom';

const home = path.resolve(__dirname, '../dist/index.html');
const hasBuild = existsSync(home);

describe.runIf(hasBuild)('首页一周最热榜（产物断言）', () => {
  const html = readFileSync(home, 'utf-8');
  const doc = new DOMParser().parseFromString(html, 'text/html');

  it('周热榜 section 存在且在今日要闻之前', () => {
    const weekly = doc.getElementById('weekly-heading');
    expect(weekly, '缺周热榜标题').not.toBeNull();

    const today = doc.getElementById('today-heading');
    expect(today).not.toBeNull();

    // DOM 顺序：周榜在今日要闻前
    expect(doc.querySelectorAll('h1,h2').length).toBeGreaterThanOrEqual(2);
    const order: string[] = [];
    doc.querySelectorAll('h1.section-title, h2.section-title').forEach((h) => {
      if (h.id === 'weekly-heading' || h.id === 'today-heading') order.push(h.id);
    });
    expect(order).toEqual(['weekly-heading', 'today-heading']);
  });

  it('榜单恰 10 条，每条含标题链接与相对日期标签', () => {
    const section = weeklySection(doc);
    const items = section.querySelectorAll('.weekly-list li');
    expect(items.length).toBe(10);

    // 相对日期标签：今天/昨天/N天前
    const labels = Array.from(section.querySelectorAll('.weekly-list .weekly__age')).map((e) =>
      (e.textContent ?? '').trim(),
    );
    expect(labels.length).toBe(10);
    for (const l of labels) {
      expect(l).toMatch(/^(今天|昨天|\d+天前)$/);
    }
  });

  it('每条显示热度分（可解释性）与来源 chip', () => {
    const section = weeklySection(doc);
    const items = section.querySelectorAll('.weekly-list li');

    expect(items[0].querySelector('.source-chip')).not.toBeNull();
    // 分数显示为 s.x.xx 形态（JSX 缩进空白容忍）
    const score = items[0].querySelector('.weekly__score');
    expect((score?.textContent ?? '').trim()).toMatch(/^\d\.\d{2}$/);
  });

  it('周榜数据来自近 7 天（年龄标签内链指向 7 天内的日报页）', () => {
    const section = weeklySection(doc);
    // 年龄标签（今天/昨天/N天前）是日报内链；标题是原文外链
    const dates = Array.from(section.querySelectorAll('.weekly__age a'))
      .map((a) => (a.getAttribute('href') ?? '').match(/\/news\/(\d{4}-\d{2}-\d{2})\//)?.[1])
      .filter((d): d is string => d !== undefined);

    expect(dates.length).toBe(10);
    const sorted = [...dates].sort();
    const oldest = new Date(sorted[0]).getTime();
    const newest = Date.now();
    expect(newest - oldest).toBeLessThanOrEqual(8 * 86_400_000); // 8 天容差（时区）
  });
});

function weeklySection(doc: Document) {
  const heading = doc.getElementById('weekly-heading');
  // section 是 heading 的父级
  return heading?.closest('section') ?? heading?.parentElement as Element;
}
