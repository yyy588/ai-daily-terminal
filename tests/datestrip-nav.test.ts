import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DOMParser } from 'linkedom';

const distDir = path.resolve(__dirname, '../dist');
const homePage = path.join(distDir, 'index.html');
const hasBuild = existsSync(homePage);

describe.runIf(hasBuild)('导航中文化与日期条（产物断言）', () => {
  const html = readFileSync(homePage, 'utf-8');
  const doc = new DOMParser().parseFromString(html, 'text/html');

  it('导航四项为中文，无英文旧标签', () => {
    const nav = doc.querySelector('nav.nav');
    expect(nav).not.toBeNull();

    const labels = Array.from(nav!.querySelectorAll('a')).map((a) => (a.textContent ?? '').trim());
    expect(labels).toEqual(['终端', '要闻', '新锐榜', '模型选型']);

    // 旧英文标签不再出现在导航
    const navText = nav!.textContent ?? '';
    for (const old of ['AI_TERMINAL', 'DAILY_FEED', 'REPO_RADAR', 'ARENA_BOARD']) {
      expect(navText).not.toContain(old);
    }
  });

  it('HUD 状态读数保留英文风格（SYSTEM_ONLINE 仍在）', () => {
    // 风格层不动：HUD 条的机器读数保留
    expect(html).toContain('SYSTEM_ONLINE');
  });

  it('日期条存在：nav.date-strip 含全部档案日 chips', () => {
    const strip = doc.querySelector('nav.date-strip');
    expect(strip, '首页缺日期条').not.toBeNull();

    const chips = Array.from(strip!.querySelectorAll('a'));
    expect(chips.length).toBeGreaterThanOrEqual(4); // 至少数日档案

    // 每个 chip 链接到对应日期详情页，文本为 MM-DD
    for (const chip of chips) {
      const href = chip.getAttribute('href') ?? '';
      const text = (chip.textContent ?? '').trim().replace('今', '');
      expect(href).toMatch(/\/news\/\d{4}-\d{2}-\d{2}\/$/);
      expect(text).toMatch(/^\d{2}-\d{2}$/);
    }
  });

  it('最新一天 chip 带“今”标记（aria-label 或独立元素）', () => {
    const strip = doc.querySelector('nav.date-strip');
    const first = strip!.querySelector('a');
    expect(first!.textContent ?? '').toContain('今');
    expect(first!.getAttribute('aria-label')).toMatch(/最新/);
  });
});

describe.runIf(hasBuild)('详情页日期条（选中态）', () => {
  const distNews = path.join(distDir, 'news');
  const dates = existsSync(distNews)
    ? readFileSync(homePage, 'utf-8').match(/\/news\/(\d{4}-\d{2}-\d{2})\//g)?.slice(0, 1) ?? []
    : [];

  it('详情页有日期条且当前日 aria-current="page"', () => {
    // 取首页第一个日期 chip 的目标页验证
    const m = readFileSync(homePage, 'utf-8').match(/\/news\/(\d{4}-\d{2}-\d{2})\//);
    if (m === null) return; // 无档案时跳过
    const date = m[1];
    const page = path.join(distNews, date, 'index.html');
    if (!existsSync(page)) return;

    const dhtml = readFileSync(page, 'utf-8');
    const ddoc = new DOMParser().parseFromString(dhtml, 'text/html');
    const strip = ddoc.querySelector('nav.date-strip');
    expect(strip, '详情页缺日期条').not.toBeNull();

    const current = strip!.querySelector('a[aria-current="page"]');
    expect(current?.getAttribute('href')).toContain(date);
  });
});
