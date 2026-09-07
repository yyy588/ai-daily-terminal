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

  it('日期月历存在：nav.date-cal 含月历网格与周表头', () => {
    const cal = doc.querySelector('nav.date-cal');
    expect(cal, '首页缺日期月历').not.toBeNull();

    // 每个月历的表头都是 一~日；双月并排时总 weekday = 月历数 × 7
    const weekdays = Array.from(cal!.querySelectorAll('.date-cal__weekday')).map((w) => (w.textContent ?? '').trim());
    expect(weekdays.slice(0, 7)).toEqual(['一', '二', '三', '四', '五', '六', '日']);

    const grids = cal!.querySelectorAll('.date-cal__grid');
    expect(grids.length).toBeGreaterThanOrEqual(1);
    // 7 表头 + 42 格
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
