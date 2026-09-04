import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve(__dirname, '../dist');
const hasBuild = existsSync(path.join(dist, 'index.html'));

describe.runIf(hasBuild)('成熟度基建六项（产物断言）', () => {
  it('favicon.svg 存在于产物', () => {
    expect(existsSync(path.join(dist, 'favicon.svg'))).toBe(true);
  });

  it('404 页存在且含回首页链接', () => {
    const p = path.join(dist, '404.html');
    expect(existsSync(p)).toBe(true);
    const html = readFileSync(p, 'utf-8');
    expect(html).toContain('SIGNAL_LOST');
    expect(html).toContain('/ai-daily-terminal/');
  });

  it('sitemap-index.xml + robots.txt 存在', () => {
    expect(existsSync(path.join(dist, 'sitemap-index.xml'))).toBe(true);
    expect(existsSync(path.join(dist, 'robots.txt'))).toBe(true);
  });

  it('首页 head：favicon 引用 + OG meta + RSS alternate', () => {
    const html = readFileSync(path.join(dist, 'index.html'), 'utf-8');
    expect(html).toContain('rel="icon"');
    expect(html).toContain('og:title');
    expect(html).toContain('og:image');
    expect(html).toContain('application/rss+xml');
  });

  it('rss.xml 产物：channel + item（每日一条）', () => {
    const p = path.join(dist, 'rss.xml');
    expect(existsSync(p)).toBe(true);
    const xml = readFileSync(p, 'utf-8');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toMatch(/<item>[\s\S]*AI 要闻 \d{4}-\d{2}-\d{2}<\/title>/);
  });

  it('og-card.png 存在', () => {
    expect(existsSync(path.join(dist, 'og-card.png'))).toBe(true);
  });

  it('首页不再有检修日志存档区（已由日期条+订阅卡替代）', () => {
    const html = readFileSync(path.join(dist, 'index.html'), 'utf-8');
    expect(html).not.toContain('检修日志存档');
    expect(html).toContain('订阅');
  });
});
