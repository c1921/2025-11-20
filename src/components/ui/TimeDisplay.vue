<script setup lang="ts">
import { computed } from 'vue';
import type { World } from '../../world/World';
import { TimeSpeed } from '../../time/types';

const props = defineProps<{
  world: World | null;
}>();

// 计算属性从 World 获取数据
const timeSystem = computed(() => props.world?.getTimeSystem());
const currentTime = computed(() => timeSystem.value?.getCurrentTime());
const timeSpeed = computed(() => timeSystem.value?.getTimeSpeed() ?? TimeSpeed.PAUSED);

const formattedDate = computed(() => {
  if (!currentTime.value) return '--';
  const t = currentTime.value;
  return `第 ${t.year} 年 ${t.month} 月 ${t.day} 日`;
});

const totalDays = computed(() => currentTime.value?.totalDays ?? 0);

// 速度选项
const speedOptions = [
  { value: TimeSpeed.PAUSED, label: '⏸️ 暂停', icon: '⏸️' },
  { value: TimeSpeed.NORMAL, label: '▶️ 正常', icon: '▶️' },
  { value: TimeSpeed.FAST, label: '⏩ 快速', icon: '⏩' },
  { value: TimeSpeed.VERY_FAST, label: '⏭️ 极速', icon: '⏭️' }
];

function getSpeedLabel(speed: TimeSpeed): string {
  return speedOptions.find(opt => opt.value === speed)?.label || '未知';
}

function setTimeSpeed(speed: TimeSpeed): void {
  timeSystem.value?.setTimeSpeed(speed);
}
</script>

<template>
  <div class="time-display w-110">
    <!-- 日期显示 -->
    <div class="time-info">
      <span class="time-icon">📅</span>
      <span class="time-date">{{ formattedDate }}</span>
      <span class="time-total">({{ totalDays }} 天)</span>
    </div>

    <!-- 分隔线 -->
    <div class="time-divider"></div>

    <!-- 速度控制按钮 -->
    <div class="time-controls">
      <button
        v-for="option in speedOptions"
        :key="option.value"
        class="btn btn-sm btn-square"
        :class="{
          'btn-primary': timeSpeed === option.value,
          'btn-ghost': timeSpeed !== option.value
        }"
        :title="option.label"
        @click="setTimeSpeed(option.value)"
      >
        {{ option.icon }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.time-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.time-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-icon {
  font-size: 1.25rem;
}

.time-date {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  white-space: nowrap;
}

.time-total {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
}

.time-divider {
  width: 1px;
  height: 1.5rem;
  background: rgba(255, 255, 255, 0.2);
}

.time-controls {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}
</style>
