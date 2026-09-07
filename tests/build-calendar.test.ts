import { describe, expect, it } from 'vitest';
import { buildCalendars, intensityClass, type CalendarCell } from '@lib/build-calendar';
import type { DailyDigest } from '@lib/types';

function digest(date: string, count: number): DailyDigest {
  return {
    date,
    entries: Array.from({ length: count }, (_, i) => ({
      id: `${date}-${i}`,
      title: `新闻${i}`,
      link: `https://x/${date}/${i}`,
      pubDate: `${date}T10:00:00+08:00`,
      summary: '',
      sources: ['qbitai'],
    })),
  };
}

describe('buildCalendars（档案 → 月历矩阵）', () => {
  const digests = [
    digest('2026-09-07', 25),
    digest('2026-09-05', 12),
    digest('2026-09-01', 5),
    digest('2026-08-30', 8),
  ];

  it('跨月档案产出两个月历，倒序（最新月在前）', () => {
    const cals = buildCalendars(digests, 2);
    expect(cals).toHaveLength(2);
    expect(cals[0].yearMonth).toBe('2026-09');
    expect(cals[1].yearMonth).toBe('2026-08');
  });

  it('月内格子数 = 6 周 × 7 天（固定网格，形态完整）', () => {
    for (const cal of buildCalendars(digests, 2)) {
      expect(cal.cells).toHaveLength(42);
    }
  });

  it('首格对齐周一：2026-09-01 是周二，则首格（周一）为月前空格', () => {
    const [sep] = buildCalendars(digests, 2);
    // 2026-09-01 周二 → cells[0]（周一 8-31）无档案非本月，cells[1] 才是 09-01
    expect(sep.cells[0].day).toBe(null);
    expect(sep.cells[1].day).toBe(1);
    expect(sep.cells[1].hasArchive).toBe(true);
  });

  it('有档案日带 count 与 date；无档案的月内日 hasArchive=false 不可点', () => {
    const [sep] = buildCalendars(digests, 2);
    const day5 = sep.cells.find((c) => c.day === 5)!;
    expect(day5.hasArchive).toBe(true);
    expect(day5.count).toBe(12);
    expect(day5.date).toBe('2026-09-05');

    const day2 = sep.cells.find((c) => c.day === 2)!;
    expect(day2.hasArchive).toBe(false);
    expect(day2.date).toBeNull();
  });

  it('单月档案只出一个月历', () => {
    const cals = buildCalendars([digest('2026-09-07', 3)], 2);
    expect(cals).toHaveLength(1);
    expect(cals[0].yearMonth).toBe('2026-09');
  });

  it('空档案返回空数组不炸', () => {
    expect(buildCalendars([], 2)).toEqual([]);
  });
});

describe('intensityClass（4 档深浅）', () => {
  it('空 / 1-9 / 10-19 / 20+ 四档', () => {
    expect(intensityClass(0)).toBe('lv0');
    expect(intensityClass(1)).toBe('lv1');
    expect(intensityClass(9)).toBe('lv1');
    expect(intensityClass(10)).toBe('lv2');
    expect(intensityClass(19)).toBe('lv2');
    expect(intensityClass(20)).toBe('lv3');
    expect(intensityClass(40)).toBe('lv3');
  });
});

describe('CalendarCell 类型形状（编译期契约由测试消费保证）', () => {
  it('cell 字段完整', () => {
    const cell: CalendarCell = { day: 1, date: '2026-09-01', count: 5, hasArchive: true };
    expect(cell.day).toBe(1);
  });
});
