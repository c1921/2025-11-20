/**
 * 时间系统的核心类型定义
 *
 * 历法规则：
 * - 一年 365 天，每四年闰一天
 * - 每年 13 个月，每月 28 天
 * - 每月 4 星期，每星期 7 天
 * - 13 * 28 = 364 天
 * - 平年多出 1 个【年日】，闰年再额外多出 1 个【闰日】
 * - 年日和闰日不属于任何月份，不计入周循环
 * - 年日在 13 月 28 日后，新年第一天之前
 * - 闰日在年日前一天
 */

/**
 * 特殊日期类型
 */
export const SpecialDayType = {
  /** 普通日期 */
  NORMAL: 'normal',
  /** 闰日（四年一次，在年日前一天） */
  LEAP_DAY: 'leap_day',
  /** 年日（每年最后一天，在新年前） */
  YEAR_DAY: 'year_day'
} as const;

export type SpecialDayType = typeof SpecialDayType[keyof typeof SpecialDayType];

/**
 * 游戏时间数据结构
 */
export interface GameTime {
  /** 年份（从 1 开始） */
  year: number;

  /** 月份（1-13），特殊日期时为 0 */
  month: number;

  /** 日期（1-28），特殊日期时为具体的特殊日 */
  day: number;

  /** 星期几（1-7），特殊日期时为 0 */
  weekday: number;

  /** 特殊日期类型 */
  specialDay: SpecialDayType;

  /** 从游戏开始经过的总天数 */
  totalDays: number;
}

/**
 * 时间推进速度
 */
export const TimeSpeed = {
  /** 暂停 */
  PAUSED: 0,
  /** 正常速度（1天/秒） */
  NORMAL: 1,
  /** 快速（2天/秒） */
  FAST: 2,
  /** 极速（4天/秒） */
  VERY_FAST: 4
} as const;

export type TimeSpeed = typeof TimeSpeed[keyof typeof TimeSpeed];

/**
 * 时间配置
 */
export interface TimeConfig {
  /** 每月天数 */
  readonly DAYS_PER_MONTH: 28;
  /** 每年月数 */
  readonly MONTHS_PER_YEAR: 13;
  /** 每星期天数 */
  readonly DAYS_PER_WEEK: 7;
  /** 普通年天数 */
  readonly DAYS_PER_YEAR: 365;
  /** 闰年周期 */
  readonly LEAP_YEAR_CYCLE: 4;
}

/**
 * 时间常量
 */
export const TIME_CONSTANTS: TimeConfig = {
  DAYS_PER_MONTH: 28,
  MONTHS_PER_YEAR: 13,
  DAYS_PER_WEEK: 7,
  DAYS_PER_YEAR: 365,
  LEAP_YEAR_CYCLE: 4
};
