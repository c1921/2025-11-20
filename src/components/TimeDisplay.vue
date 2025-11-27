<script setup lang="ts">
import { useTimeStore } from '../stores/timeStore';
import { TimeSpeed } from '../time/types';

const timeStore = useTimeStore();

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
</script>

<template>
  <div class="card bg-base-300/90 backdrop-blur-sm shadow-xl">
    <div class="card-body p-4">
      <h3 class="card-title text-sm text-primary">📅 游戏时间</h3>

      <!-- 日期显示 -->
      <div class="bg-base-100/50 rounded-lg p-3 space-y-1">
        <div class="text-lg font-bold text-center">
          {{ timeStore.formattedDate }}
        </div>
        <div class="text-xs text-center text-base-content/50">
          总计 {{ timeStore.totalDays }} 天
        </div>
      </div>

      <!-- 时间控制 -->
      <div class="divider my-2">时间控制</div>

      <!-- 当前速度显示 -->
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-base-content/70">当前速度:</span>
        <span class="text-sm font-semibold">
          {{ getSpeedLabel(timeStore.timeSpeed.value) }}
        </span>
      </div>

      <!-- 速度选择按钮 -->
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="option in speedOptions"
          :key="option.value"
          class="btn btn-sm"
          :class="{
            'btn-primary': timeStore.timeSpeed.value === option.value,
            'btn-ghost': timeStore.timeSpeed.value !== option.value
          }"
          @click="timeStore.setTimeSpeed(option.value)"
        >
          {{ option.icon }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  min-width: 16rem;
}
</style>
