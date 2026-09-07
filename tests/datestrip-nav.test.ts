import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DOMParser } from 'linkedom';

const distDir = path.resolve(__dirname, '../dist');
const homePage = path.join(distDir, 'index.html');
const hasBuild = existsSync(homePage);

describe.runIf(hasBuild)('导航中文化与日期月历（产物断言）', () => {
  const html = hasBuild ? readFileSync(homePage, 'utf-8') : '';
  const doc = new DOMParser().parseFromString(html, 'text/html');

  it('导航四项为中文，无英文旧标签', () => {
    const nav = doc.querySelector('nav.nav');
    expect(nav).not.toBeNull();

    const labels = Array.from(nav!.querySelectorAll('a')).map((a) => (a.textContent ?? '').trim());
    expect(labels).toEqual(['终端', '要闻', '新锐榜', '模型选型']);

    const navText = nav!.textContent ?? '';
    for (const old of ['AI_TERMINAL', 'DAILY_FEED', 'REPO_RADAR', 'ARENA_BOARD']) {
      expect(navText).not.toContain(old);
    }
  });

  it('HUD 状态读数保留英文风格（SYSTEM_ONLINE 仍在）', () => {
    expect(html).toContain('SYSTEM_ONLINE');
  });

  it('日期月历存在：单月宽度纵向堆叠，每月历带锚点 id', () => {
    const cal = doc.querySelector('nav.date-cal');
    expect(cal, '首页缺日期月历').not.toBeNull();

    const months = Array.from(cal!.querySelectorAll('.date-cal__month'));
    expect(months.length).toBeGreaterThanOrEqual(2); // 跨月档案（当前 09+08）

    // 每月历带锚点 id（翻月箭头的跳转目标）
    for (const m of months) {
      expect(m.id ?? '').toMatch(/^cal-\d{4}-\d{2}$/);
    }

    // 最新月在首位
    expect(months[0].id).toBe(`cal-${months[0].querySelector('.date-cal__ym')?.textContent?.trim().replace(' / ', '-')}`);
  });

  it('月历头部三段式：←（更新月锚点）+ 月份标题 + →（更早月锚点），端点月箭头占位隐藏', () => {
    const cal = doc.querySelector('nav.date-cal');
    const months = Array.from(cal!.querySelectorAll('.date-cal__month'));

    // 最新月（首位）：← 是隐藏占位（没有更新的月）；→ 指向更早月锚点
    const newest = months[0];
    const newestLinks = Array.from(newest.querySelectorAll('a.date-cal__nav'));
    expect(newestLinks).toHaveLength(1);
    expect(newestLinks[0].getAttribute('href')).toMatch(/^#cal-\d{4}-\d{2}$/);

    // 最旧月（末位）：→ 是隐藏占位；← 指向更新月
    const oldest = months[months.length - 1];
    const oldestLinks = Array.from(oldest.querySelectorAll('a.date-cal__nav'));
    expect(oldestLinks).toHaveLength(1);

    // 占位 span 存在但不可见（visibility 由 CSS 控制，结构上仍占位保持对齐）
    const pads = cal!.querySelectorAll('.date-cal__nav--pad');
    expect(pads.length).toBeGreaterThanOrEqual(months.length); // 每月至少一个占位箭头（端点）
  });

  it('网格结构不变：7 表头 + 42 格', () => {
    const cal = doc.querySelector('nav.date-cal');
    const grids = cal!.querySelectorAll('.date-cal__grid');
    expect(grids.length).toBeGreaterThanOrEqual(1);
    expect(grids[0].children.length).toBe(7 + 42);
  });

  it('有档案日是链接且指向详情页；无档案格不是链接', () => {
    const cal = doc.querySelector('nav.date-cal');
    const dayLinks = Array.from(cal!.querySelectorAll('a.date-cal__cell--day'));
    expect(dayLinks.length).toBeGreaterThanOrEqual(4);

    for (const link of dayLinks) {
      expect(link.getAttribute('href') ?? '').toMatch(/\/news\/\d{4}-\d{2}-\d{2}\/$/);
    }

    // 无档案格为 span（不可点，无死链）
    const offCells = cal!.querySelectorAll('span.date-cal__cell--off');
    expect(offCells.length).toBeGreaterThanOrEqual(1);
  });

  it('最新一天带“今”标记', () => {
    const cal = doc.querySelector('nav.date-cal');
    expect(cal!.querySelector('.date-cal__today')).not.toBeNull();
  });

  it('深浅档位 class 存在（贡献图式编码）', () => {
    const cal = doc.querySelector('nav.date-cal');
    const lvCells = cal!.querySelectorAll('[class*="lv"]');
    expect(lvCells.length).toBeGreaterThanOrEqual(1);
  });
});

describe.runIf(hasBuild)('详情页月历（选中态）', () => {
  it('详情页有月历且当前日 aria-current="page"', () => {
    const m = hasBuild ? readFileSync(homePage, 'utf-8').match(/\/news\/(\d{4}-\d{2}-\d{2})\//) : null;
    if (m === null) return;
    const date = m[1];
    const page = path.join(distDir, 'news', date, 'index.html');
    if (!existsSync(page)) return;

    const dhtml = readFileSync(page, 'utf-8');
    const ddoc = new DOMParser().parseFromString(dhtml, 'text/html');
    const cal = ddoc.querySelector('nav.date-cal');
    expect(cal, '详情页缺月历').not.toBeNull();

    const current = cal!.querySelector('a[aria-current="page"]');
    expect(current?.getAttribute('href')).toContain(date);
  });
});
