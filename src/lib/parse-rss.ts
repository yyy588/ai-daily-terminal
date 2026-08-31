import { DOMParser } from 'linkedom';
import type { RawEntry } from './types';

/**
 * RSS 2.0 XML → RawEntry[]。
 * 使用 linkedom 解析（Node 环境无全局 DOMParser）。
 * 脏数据（缺 title/pubDate/link）静默丢弃；整体结构异常返回空数组。
 */
export function parseRss(xml: string, sourceId: string): RawEntry[] {
  const doc = tryParse(xml);
  if (doc === null) return [];

  const items = Array.from(doc.getElementsByTagName('item'));
  return items.flatMap((item) => parseItem(item, sourceId));
}

function tryParse(xml: string): Document | null {
  try {
    const parsed = new DOMParser().parseFromString(xml, 'text/xml');
    const doc = parsed as unknown as {
      getElementsByTagName(tag: string): { length: number; [i: number]: ElementLike };
    };
    // 非 XML 内容不抛异常，而是产出 parsererror 文档
    if (doc.getElementsByTagName('parsererror').length > 0) return null;
    return parsed as never;
  } catch {
    return null;
  }
}

interface ElementLike {
  getElementsByTagName(tag: string): { [i: number]: ElementLike | undefined; length: number };
  textContent: string | null;
}

function parseItem(item: ElementLike, sourceId: string): RawEntry[] {
  const title = textOf(item, 'title');
  const link = textOf(item, 'link');
  const pubDate = textOf(item, 'pubDate');
  const description = textOf(item, 'description');

  // 必填字段缺失的脏条目直接丢弃
  if (!title || !link || !pubDate) return [];

  return [{ title, link, pubDate, description: description || undefined, sourceId }];
}

/** 取第一个子元素文本；textContent 自动合并 CDATA 与解码后的 XML 实体 */
function textOf(item: ElementLike, tag: string): string {
  return item.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
}
