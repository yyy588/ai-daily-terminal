import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DOMParser } from 'linkedom';

const home = path.resolve(__dirname, '../dist/index.html');
const hasBuild = existsSync(home);

describe.runIf(hasBuild)('RSS 订阅卡（产物断言）', () => {
  const html = readFileSync(home, 'utf-8');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // 用稳定 id 定位（subscribe-heading）——textContent.includes('订阅') 会被
  // 含"订阅"字样的新闻标题误中（如"Claude Max 订阅条款"上了周热榜）
  const section = doc.getElementById('subscribe-heading')?.parentElement ?? null;

  it('订阅卡存在且有复制按钮（button + 目标地址）', () => {
    expect(section).toBeTruthy();

    const btn = section!.querySelector('button[data-copy]');
    expect(btn, '缺复制按钮').not.toBeNull();
    // 按钮目标 = 完整 RSS 地址
    expect(btn!.getAttribute('data-copy')).toBe('https://yyy588.github.io/ai-daily-terminal/rss.xml');
    expect((btn!.textContent ?? '').trim()).toContain('复制');
  });

  it('订阅地址以醒目 code 块展示（不点也能手动抄）', () => {
    const addr = section!.querySelector('.rss-addr');
    expect(addr).not.toBeNull();
    expect((addr!.textContent ?? '').trim()).toBe('https://yyy588.github.io/ai-daily-terminal/rss.xml');
  });

  it('复制脚本内联且含降级路径（clipboard API + execCommand）与成功反馈', () => {
    expect(html).toMatch(/navigator\.clipboard/);
    expect(html).toMatch(/execCommand|clipboard\.writeText/);
    // 成功反馈节点
    expect(section!.querySelector('.rss-copied')).not.toBeNull();
  });

  it('旧文案已清理：不再有"日期条"旧称呼', () => {
    expect(html).not.toContain('日期条');
  });

  it('不再有裸链接 rss.xml（点击看 XML 的坑替换为复制交互）', () => {
    const rawLink = Array.from(section!.querySelectorAll('a')).find((a) =>
      (a.getAttribute('href') ?? '').endsWith('rss.xml'),
    );
    expect(rawLink).toBeUndefined();
  });
});
