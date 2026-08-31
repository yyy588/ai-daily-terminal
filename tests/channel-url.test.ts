import { describe, expect, it } from 'vitest';
import { encodeQuery, channelUrl } from '@lib/repos';

describe('encodeQuery（+ 编码回归防线）', () => {
  it('topic 分隔符 + 不被编码成 %2B（GitHub 当字面加号会查出 0 结果）', () => {
    expect(encodeQuery('topic:llm+topic:ai created:>2026-08-24')).toBe(
      'topic:llm+topic:ai%20created:>2026-08-24',
    );
  });

  it('空格编码为 %20', () => {
    expect(encodeQuery('a b')).toBe('a%20b');
  });

  it('中文正确编码', () => {
    expect(encodeQuery('大模型')).toBe(encodeURIComponent('大模型'));
  });

  it('语法字符 + : > 原样保留', () => {
    const encoded = encodeQuery('topic:llm+topic:ai created:>2026-01-01');
    expect(encoded).toContain('+');
    expect(encoded).toContain(':');
    expect(encoded).toContain('>');
    expect(encoded).not.toContain('%2B');
    expect(encoded).not.toContain('%3A');
  });
});

describe('channelUrl', () => {
  it('拼出完整 Search API 地址（语法字符原样，中文与空格编码）', () => {
    expect(channelUrl('大模型', '2026-08-24', 20)).toBe(
      'https://api.github.com/search/repositories?q=%E5%A4%A7%E6%A8%A1%E5%9E%8B%20created:>2026-08-24&sort=stars&order=desc&per_page=20',
    );
  });
});
