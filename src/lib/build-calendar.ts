import type { DailyDigest } from './types';

/**
 * 档案 → 迷你月历矩阵（GitHub 贡献图式）。
 * 每月固定 6×7=42 格（周一起始），月前/月后补灰格——形态完整优于紧凑。
 * 有档案日按条数 4 档深浅；无档案日不可点。
 */

export interface CalendarCell {
  /** 月内日数字；月前/月后占位格为 null */
  readonly day: number | null;
  /** 档案日期 YYYY-MM-DD；无档案/占位格为 null */
  readonly date: string | null;
  /** 当日新闻条数；无档案为 0 */
  readonly count: number;
  readonly hasArchive: boolean;
}

export interface MonthCalendar {
  /** YYYY-MM */
  readonly yearMonth: string;
  readonly cells: readonly CalendarCell[];
}

/** 条数 → 深浅档位（lv0 空格 / lv1 少 / lv2 中 / lv3 多） */
export function intensityClass(count: number): string {
  if (count <= 0) return 'lv0';
  if (count < 10) return 'lv1';
  if (count < 20) return 'lv2';
  return 'lv3';
}

/** 周一起始的星期序号（0=周一 … 6=周日）；用 UTC 计算避免时区漂移 */
function mondayIndex(y: number, m: number, d: number): number {
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** 档案按日期 → 条数索引 */
function countByDate(digests: readonly DailyDigest[]): Map<string, number> {
  return new Map(digests.map((d) => [d.date, d.entries.length]));
}

export function buildCalendars(
  digests: readonly DailyDigest[],
  maxMonths = 2,
): MonthCalendar[] {
  if (digests.length === 0) return [];

  const counts = countByDate(digests);
  const months = [...new Set(digests.map((d) => d.date.slice(0, 7)))].sort().reverse().slice(0, maxMonths);

  return months.map((ym) => {
    const [y, m] = ym.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lead = mondayIndex(y, m, 1); // 月前空格数

    const cells: CalendarCell[] = [];
    // 月前占位
    for (let i = 0; i < lead; i++) {
      cells.push({ day: null, date: null, count: 0, hasArchive: false });
    }
    // 月内每天
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${ym}-${String(d).padStart(2, '0')}`;
      const count = counts.get(date) ?? 0;
      cells.push({ day: d, date: count > 0 ? date : null, count, hasArchive: count > 0 });
    }
    // 月后补足 42 格
    while (cells.length < 42) {
      cells.push({ day: null, date: null, count: 0, hasArchive: false });
    }

    return { yearMonth: ym, cells: cells.slice(0, 42) };
  });
}
