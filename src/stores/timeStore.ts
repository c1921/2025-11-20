/**
 * @deprecated 此文件已废弃，请使用 src/world/systems/TimeSystem.ts 代替
 *
 * 旧版时间系统状态管理（基于 Vue Composition API）
 * 已被纯 TypeScript 版本的 TimeSystem 取代
 *
 * 迁移指南：
 * - useTimeStore() -> world.getTimeSystem()
 * - timeStore.update(timestamp) -> timeSystem.update(timestamp)
 * - timeStore.currentTime -> timeSystem.getCurrentTime()
 * - timeStore.setTimeSpeed(speed) -> timeSystem.setTimeSpeed(speed)
 *
 * 此文件保留仅用于参考，未来版本将删除
 */

import { ref, computed } from 'vue';
import type { GameTime } from '../time/types';
import { TimeSpeed, SpecialDayType } from '../time/types';
import { calculateGameTime, formatDate, formatDateShort } from '../time/timeUtils';

/**
 * 当前游戏时间（总天数）
 */
const totalDays = ref(0);

/**
 * 时间流逝速度
 */
const timeSpeed = ref<TimeSpeed>(TimeSpeed.PAUSED);

/**
 * 上次更新的时间戳（毫秒）
 */
let lastUpdateTime = 0;

/**
 * 累积的时间差（毫秒）
 */
let accumulatedTime = 0;

/**
 * 计算当前游戏时间
 */
const currentTime = computed<GameTime>(() => calculateGameTime(totalDays.value));

/**
 * 格式化的完整日期
 */
const formattedDate = computed(() => formatDate(currentTime.value));

/**
 * 格式化的简短日期
 */
const formattedDateShort = computed(() => formatDateShort(currentTime.value));

/**
 * 是否为特殊日期
 */
const isSpecialDay = computed(() => currentTime.value.specialDay !== SpecialDayType.NORMAL);

/**
 * 时间是否暂停
 */
const isPaused = computed(() => timeSpeed.value === TimeSpeed.PAUSED);

/**
 * 设置时间速度
 * @param speed 新的时间速度
 */
function setTimeSpeed(speed: TimeSpeed) {
  timeSpeed.value = speed;
  const speedName = Object.entries(TimeSpeed).find(([_, v]) => v === speed)?.[0] || 'UNKNOWN';
  console.log(`⏱️ 时间速度设置为: ${speedName} (${speed}x)`);
}

/**
 * 切换暂停/继续
 */
function togglePause() {
  if (timeSpeed.value === TimeSpeed.PAUSED) {
    setTimeSpeed(TimeSpeed.NORMAL);
  } else {
    setTimeSpeed(TimeSpeed.PAUSED);
  }
}

/**
 * 推进时间（天）
 * @param days 要推进的天数
 */
function advanceTime(days: number) {
  if (days <= 0) return;

  const oldTime = currentTime.value;
  totalDays.value += days;
  const newTime = currentTime.value;

  // 输出日志
  if (days === 1) {
    console.log(`📅 ${formatDateShort(newTime)}`);
  } else {
    console.log(`📅 时间流逝 ${days} 天: ${formatDateShort(oldTime)} → ${formatDateShort(newTime)}`);
  }

  // 检查是否跨年
  if (oldTime.year !== newTime.year) {
    console.log(`🎊 新年快乐！欢迎来到第 ${newTime.year} 年！`);
  }
}

/**
 * 更新时间系统（由游戏循环调用）
 * @param currentTimestamp 当前时间戳（毫秒）
 */
function update(currentTimestamp: number) {
  // 如果暂停，重置计时器
  if (timeSpeed.value === TimeSpeed.PAUSED) {
    lastUpdateTime = currentTimestamp;
    accumulatedTime = 0;
    return;
  }

  // 初始化
  if (lastUpdateTime === 0) {
    lastUpdateTime = currentTimestamp;
    return;
  }

  // 计算时间差
  const deltaTime = currentTimestamp - lastUpdateTime;
  lastUpdateTime = currentTimestamp;

  // 累积时间
  accumulatedTime += deltaTime;

  // 每秒推进的天数 = timeSpeed
  // 1000 毫秒 = timeSpeed 天
  const msPerDay = 1000 / timeSpeed.value;

  // 计算应该推进多少天
  const daysToAdvance = Math.floor(accumulatedTime / msPerDay);

  if (daysToAdvance > 0) {
    advanceTime(daysToAdvance);
    accumulatedTime -= daysToAdvance * msPerDay;
  }
}

/**
 * 重置时间系统
 * @param startDay 起始天数（默认为 0）
 */
function reset(startDay: number = 0) {
  totalDays.value = startDay;
  timeSpeed.value = TimeSpeed.PAUSED;
  lastUpdateTime = 0;
  accumulatedTime = 0;
  console.log(`🔄 时间系统已重置到第 ${startDay} 天`);
}

/**
 * 设置时间到特定日期
 * @param year 年份
 * @param month 月份（0 表示特殊日期）
 * @param day 日期
 */
function setDate(year: number, month: number, day: number) {
  // 简化实现：通过迭代计算总天数
  let days = 0;

  // 计算完整年份的天数
  for (let y = 1; y < year; y++) {
    days += y % 4 === 0 ? 366 : 365;
  }

  // 计算当前年份的天数
  if (month > 0) {
    days += (month - 1) * 28 + (day - 1);
  } else {
    // 特殊日期
    days += 13 * 28; // 所有普通月份
    if (day === 0) {
      // 年日或闰日
      const isLeap = year % 4 === 0;
      if (isLeap) {
        days += 1; // 闰日在年日前
      }
    }
  }

  totalDays.value = days;
  console.log(`📅 时间已设置为: ${formatDate(currentTime.value)}`);
}

/**
 * 获取时间状态（用于存档）
 */
function getState() {
  return {
    totalDays: totalDays.value,
    timeSpeed: timeSpeed.value
  };
}

/**
 * 加载时间状态（用于读档）
 */
function loadState(state: { totalDays: number; timeSpeed: TimeSpeed }) {
  totalDays.value = state.totalDays;
  timeSpeed.value = state.timeSpeed;
  lastUpdateTime = 0;
  accumulatedTime = 0;
  console.log(`📂 时间状态已加载: ${formatDate(currentTime.value)}`);
}

export function useTimeStore() {
  return {
    // 状态
    totalDays,
    timeSpeed,
    currentTime,

    // 计算属性
    formattedDate,
    formattedDateShort,
    isSpecialDay,
    isPaused,

    // 方法
    setTimeSpeed,
    togglePause,
    advanceTime,
    update,
    reset,
    setDate,
    getState,
    loadState
  };
}
