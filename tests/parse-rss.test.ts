import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseRss } from '@lib/parse-rss';

const fixtureDir = path.resolve(__dirname, 'fixtures');
const jiqizhixinXml = readFileSync(path.join(fixtureDir, 'jiqizhixin.xml'), 'utf-8');
const qbitaiXml = readFileSync(path.join(fixtureDir, 'qbitai.xml'), 'utf-8');

describe('parseRss', () => {
  it('解析合法 RSS，返回结构化条目并带上源 id', () => {
    const entries = parseRss(qbitaiXml, 'qbitai');

    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      title: 'OpenAI发布Windows安全沙盒 支持一键隔离运行',
      link: 'https://www.qbitai.com/2026/08/285001.html',
      sourceId: 'qbitai',
    });
  });

  it('丢弃缺 pubDate 或缺 title 的脏条目', () => {
    const entries = parseRss(jiqizhixinXml, 'jiqizhixin');

    // 5 条原始数据中 2 条脏数据被丢弃
    expect(entries).toHaveLength(3);
    const titles = entries.map((e) => e.title);
    expect(titles).not.toContain('缺失时间的条目');
  });

  it('解析 HTML 实体转义的 description', () => {
    const entries = parseRss(jiqizhixinXml, 'jiqizhixin');
    const sandbox = entries.find((e) => e.title.includes('OpenAI'))!;

    expect(sandbox.description).toContain('OpenAI 今日推出 Windows 平台安全沙盒');
  });

  it('解析 CDATA 包裹的 description', () => {
    const entries = parseRss(jiqizhixinXml, 'jiqizhixin');
    const anthropic = entries.find((e) => e.title.includes('Anthropic'))!;

    expect(anthropic.description).toContain('9000 亿美元');
  });

  it('链接中的 &amp; 实体被正确解码', () => {
    const entries = parseRss(qbitaiXml, 'qbitai');
    const deepseek = entries.find((e) => e.title.includes('DeepSeek'))!;

    expect(deepseek.link).toBe('https://www.qbitai.com/2026/08/285002.html?utm_source=rss&ref=home');
  });

  it('pubDate 保留原始字符串（含时区偏移）', () => {
    const entries = parseRss(jiqizhixinXml, 'jiqizhixin');
    const anthropic = entries.find((e) => e.title.includes('Anthropic'))!;

    expect(anthropic.pubDate).toBe('Sun, 30 Aug 2026 23:45:00 +0800');
  });

  it('空 XML / 非 RSS 内容返回空数组而非抛异常', () => {
    expect(parseRss('', 'jiqizhixin')).toEqual([]);
    expect(parseRss('<html><body>not rss</body></html>', 'jiqizhixin')).toEqual([]);
    expect(parseRss('<?xml version="1.0"?><rss></rss>', 'jiqizhixin')).toEqual([]);
  });
});
