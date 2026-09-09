import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DOMParser } from 'linkedom';

const dist = path.resolve(__dirname, '../dist');
const homeExists = existsSync(path.join(dist, 'index.html'));

describe.runIf(homeExists)('日报条目分享锚点', () => {
  const date = (() => {
    const html = readFileSync(path.join(dist, 'index.html'), 'utf-8');
    return html.match(/\/news\/(\d{4}-\d{2}-\d{2})\//)?.[1] ?? null;
  })();

  it('每条 <article> 带 id 锚点（n1, n2, ...），最新日详情页全量', () => {
    // 取档案最新日：扫首页全部 /news/ 日期链接取最大（月历/日报流链接任意序）
    const homeHtml = readFileSync(path.join(dist, 'index.html'), 'utf-8');
    const dates = [...homeHtml.matchAll(/\/news\/(\d{4}-\d{2}-\d{2})\//g)].map((m) => m[1]);
    if (dates.length === 0) return;
    const latest = dates.sort().at(-1)!;
    const page = path.join(dist, 'news', latest, 'index.html');
    if (!existsSync(page)) return;

    const doc = new DOMParser().parseFromString(readFileSync(page, 'utf-8'), 'text/html');
    const articles = doc.querySelectorAll('.day-list article');
    expect(articles.length).toBeGreaterThanOrEqual(5);

    articles.forEach((a, i) => {
      expect(a.id ?? '', `第 ${i + 1} 条缺锚点`).toBe(`n${i + 1}`);
    });
  });

  it('条目悬浮锚链接：标题旁 § 链接指向自身锚点', () => {
    if (date === null) return;
    const page = path.join(dist, 'news', date, 'index.html');
    if (!existsSync(page)) return;

    const html = readFileSync(page, 'utf-8');
    expect(html).toMatch(/href="#n\d+"/);
  });
});

describe.runIf(homeExists)('关于页', () => {
  const aboutPage = path.join(dist, 'about', 'index.html');
  const has = existsSync(aboutPage);
  const html = has ? readFileSync(aboutPage, 'utf-8') : '';
  const doc = has ? new DOMParser().parseFromString(html, 'text/html') : null;

  it('/about/ 存在且导航含入口', () => {
    expect(has, '缺关于页').toBe(true);

    const homeHtml = readFileSync(path.join(dist, 'index.html'), 'utf-8');
    const homeDoc = new DOMParser().parseFromString(homeHtml, 'text/html');
    const navLinks = Array.from(homeDoc.querySelectorAll('nav.nav a')).map((a) =>
      (a.getAttribute('href') ?? ''),
    );
    expect(navLinks.some((h) => h.endsWith('/about/'))).toBe(true);
  });

  it('内容完整：数据源声明 / 打分说明 / RSS 入口 / 30 天窗口声明', () => {
    // linkedom 的 Document.textContent 恒空（无该 API 语义），从 body 取
    const text = doc?.body?.textContent ?? '';
    expect(text).toContain('量子位');
    expect(text).toContain('爱范儿');
    expect(text).toContain('IT之家');
    expect(text).toContain('30 天');
    expect(text).toContain('rss.xml');
  });

  it('404 页有过期提示（日报仅保留 30 天）', () => {
    const p404 = path.join(dist, '404.html');
    expect(existsSync(p404)).toBe(true);
    const text = readFileSync(p404, 'utf-8');
    expect(text).toContain('30 天');
  });
});
