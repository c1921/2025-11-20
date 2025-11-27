import { TimeSpeed, type GameTime } from '../../time/types';
import { calculateGameTime, formatDate, formatDateShort } from '../../time/timeUtils';

/**
 * 时间系统（纯逻辑，无 Vue 依赖）
 * 负责游戏时间的计算、推进和状态管理
 */
export class TimeSystem {
  private totalDays = 0;
  private timeSpeed: TimeSpeed = TimeSpeed.PAUSED;
  private lastUpdateTime = 0;
  private accumulatedTime = 0;

  /**
   * 更新时间（由 World.tick() 调用）
   */
  update(timestamp: number): void {
    if (this.timeSpeed === TimeSpeed.PAUSED) {
      this.lastUpdateTime = timestamp;
      this.accumulatedTime = 0;
      return;
    }

    if (this.lastUpdateTime === 0) {
      this.lastUpdateTime = timestamp;
      return;
    }

    const deltaTime = timestamp - this.lastUpdateTime;
    this.lastUpdateTime = timestamp;
    this.accumulatedTime += deltaTime;

    const msPerDay = 1000 / this.timeSpeed;
    const daysToAdvance = Math.floor(this.accumulatedTime / msPerDay);

    if (daysToAdvance > 0) {
      this.advanceTime(daysToAdvance);
      this.accumulatedTime -= daysToAdvance * msPerDay;
    }
  }

  private advanceTime(days: number): void {
    if (days <= 0) return;
    const oldTime = this.getCurrentTime();
    this.totalDays += days;
    const newTime = this.getCurrentTime();

    if (days === 1) {
      console.log(`📅 ${formatDateShort(newTime)}`);
    } else {
      console.log(`📅 时间流逝 ${days} 天: ${formatDateShort(oldTime)} → ${formatDateShort(newTime)}`);
    }

    if (oldTime.year !== newTime.year) {
      console.log(`🎊 新年快乐！欢迎来到第 ${newTime.year} 年！`);
    }
  }

  /**
   * 获取当前游戏时间
   */
  getCurrentTime(): GameTime {
    return calculateGameTime(this.totalDays);
  }

  /**
   * 设置时间速度
   */
  setTimeSpeed(speed: TimeSpeed): void {
    this.timeSpeed = speed;
    const speedName = Object.entries(TimeSpeed).find(([_, v]) => v === speed)?.[0] || 'UNKNOWN';
    console.log(`⏱️ 时间速度设置为: ${speedName} (${speed}x)`);
  }

  /**
   * 获取时间速度
   */
  getTimeSpeed(): TimeSpeed {
    return this.timeSpeed;
  }

  /**
   * 切换暂停/继续
   */
  togglePause(): void {
    if (this.timeSpeed === TimeSpeed.PAUSED) {
      this.setTimeSpeed(TimeSpeed.NORMAL);
    } else {
      this.setTimeSpeed(TimeSpeed.PAUSED);
    }
  }

  /**
   * 获取用于存档的状态
   */
  getState(): TimeSystemState {
    return {
      totalDays: this.totalDays,
      timeSpeed: this.timeSpeed,
    };
  }

  /**
   * 从存档加载状态
   */
  loadState(state: TimeSystemState): void {
    this.totalDays = state.totalDays;
    this.timeSpeed = state.timeSpeed;
    this.lastUpdateTime = 0;
    this.accumulatedTime = 0;
    console.log(`📂 时间状态已加载: ${formatDate(this.getCurrentTime())}`);
  }

  /**
   * 重置时间系统
   */
  reset(startDay: number = 0): void {
    this.totalDays = startDay;
    this.timeSpeed = TimeSpeed.PAUSED;
    this.lastUpdateTime = 0;
    this.accumulatedTime = 0;
    console.log(`🔄 时间系统已重置到第 ${startDay} 天`);
  }
}

/**
 * 时间系统状态（用于存档）
 */
export interface TimeSystemState {
  totalDays: number;
  timeSpeed: TimeSpeed;
}
