import { describe, expect, it } from 'vitest';
import { internalHref } from '@lib/href';

describe('internalHref', () => {
  it('给站内路径拼上 base 前缀', () => {
    expect(internalHref('/news/')).toBe('/ai-daily-terminal/news/');
    expect(internalHref('/')).toBe('/ai-daily-terminal/');
  });

  it('带日期的详情路径', () => {
    expect(internalHref('/news/2026-08-31/')).toBe('/ai-daily-terminal/news/2026-08-31/');
  });

  it('已带前缀的路径不重复拼接', () => {
    expect(internalHref('/ai-daily-terminal/news/')).toBe('/ai-daily-terminal/news/');
  });

  it('空路径返回 base 本身', () => {
    expect(internalHref('')).toBe('/ai-daily-terminal/');
  });

  it('外部绝对 URL 原样返回', () => {
    expect(internalHref('https://example.com/x')).toBe('https://example.com/x');
  });
});
