/**
 * 时间系统工具函数
 * 提供时间计算、转换和格式化功能
 */

import type { GameTime } from './types';
import { SpecialDayType, TIME_CONSTANTS } from './types';

/**
 * 判断是否为闰年
 * @param year 年份
 * @returns 是否为闰年
 */
export function isLeapYear(year: number): boolean {
  return year % TIME_CONSTANTS.LEAP_YEAR_CYCLE === 0;
}

/**
 * 获取指定年份的总天数
 * @param year 年份
 * @returns 该年的天数
 */
export function getDaysInYear(year: number): number {
  return isLeapYear(year)
    ? TIME_CONSTANTS.DAYS_PER_YEAR + 1  // 闰年 366 天
    : TIME_CONSTANTS.DAYS_PER_YEAR;     // 平年 365 天
}

/**
 * 根据总天数计算游戏时间
 * @param totalDays 从游戏开始经过的总天数（从 0 开始）
 * @returns 完整的游戏时间对象
 */
export function calculateGameTime(totalDays: number): GameTime {
  let remainingDays = totalDays;
  let year = 1;

  // 计算年份
  while (true) {
    const daysInCurrentYear = getDaysInYear(year);
    if (remainingDays < daysInCurrentYear) {
      break;
    }
    remainingDays -= daysInCurrentYear;
    year++;
  }

  // remainingDays 现在是当前年份的第几天（从 0 开始）
  const dayOfYear = remainingDays;

  // 普通月份总共占 364 天（13 * 28）
  const regularMonthDays = TIME_CONSTANTS.MONTHS_PER_YEAR * TIME_CONSTANTS.DAYS_PER_MONTH;

  // 检查是否为特殊日期
  const isCurrentYearLeap = isLeapYear(year);

  // 特殊日期判断：
  // - 平年：第 364 天是年日
  // - 闰年：第 364 天是闰日，第 365 天是年日
  if (dayOfYear === regularMonthDays && isCurrentYearLeap) {
    // 闰日（第 364 天，闰年）
    return {
      year,
      month: 0,
      day: 0,
      weekday: 0,
      specialDay: SpecialDayType.LEAP_DAY,
      totalDays
    };
  } else if (
    (dayOfYear === regularMonthDays && !isCurrentYearLeap) ||
    (dayOfYear === regularMonthDays + 1 && isCurrentYearLeap)
  ) {
    // 年日（平年第 364 天，或闰年第 365 天）
    return {
      year,
      month: 0,
      day: 0,
      weekday: 0,
      specialDay: SpecialDayType.YEAR_DAY,
      totalDays
    };
  }

  // 普通日期
  const month = Math.floor(dayOfYear / TIME_CONSTANTS.DAYS_PER_MONTH) + 1; // 1-13
  const day = (dayOfYear % TIME_CONSTANTS.DAYS_PER_MONTH) + 1; // 1-28
  const weekday = (dayOfYear % TIME_CONSTANTS.DAYS_PER_WEEK) + 1; // 1-7

  return {
    year,
    month,
    day,
    weekday,
    specialDay: SpecialDayType.NORMAL,
    totalDays
  };
}

/**
 * 格式化星期几
 * @param weekday 星期数（1-7），0 表示特殊日期
 * @returns 格式化的星期字符串
 */
export function formatWeekday(weekday: number): string {
  if (weekday === 0) return '';
  return `星期${weekday}`;
}

/**
 * 格式化月份
 * @param month 月份（1-13），0 表示特殊日期
 * @returns 格式化的月份字符串
 */
export function formatMonth(month: number): string {
  if (month === 0) return '';
  const monthNames = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三'];
  return `${monthNames[month]}月`;
}

/**
 * 格式化特殊日期
 * @param specialDay 特殊日期类型
 * @returns 格式化的特殊日期字符串
 */
export function formatSpecialDay(specialDay: SpecialDayType): string {
  switch (specialDay) {
    case SpecialDayType.LEAP_DAY:
      return '闰日';
    case SpecialDayType.YEAR_DAY:
      return '年日';
    default:
      return '';
  }
}

/**
 * 格式化完整日期
 * @param time 游戏时间对象
 * @returns 格式化的日期字符串
 *
 * 示例：
 * - 普通日期："第 1 年 一月 1 日 星期一"
 * - 特殊日期："第 1 年 年日"
 */
export function formatDate(time: GameTime): string {
  if (time.specialDay !== SpecialDayType.NORMAL) {
    return `第 ${time.year} 年 ${formatSpecialDay(time.specialDay)}`;
  }

  return `第 ${time.year} 年 ${formatMonth(time.month)} ${time.day} 日 ${formatWeekday(time.weekday)}`;
}

/**
 * 格式化简短日期
 * @param time 游戏时间对象
 * @returns 简短的日期字符串
 *
 * 示例：
 * - 普通日期："1 年 1 月 1 日"
 * - 特殊日期："1 年 年日"
 */
export function formatDateShort(time: GameTime): string {
  if (time.specialDay !== SpecialDayType.NORMAL) {
    return `${time.year}年 ${formatSpecialDay(time.specialDay)}`;
  }

  return `${time.year}年${time.month}月${time.day}日`;
}
