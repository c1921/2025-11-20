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
  <div class="card bg-base-300/90 backdrop-blur-sm shadow-xl">
    <div class="card-body p-4">
      <h3 class="card-title text-sm text-primary">📅 游戏时间</h3>

      <!-- 日期显示 -->
      <div class="bg-base-100/50 rounded-lg p-3 space-y-1">
        <div class="text-lg font-bold text-center">
          {{ formattedDate }}
        </div>
        <div class="text-xs text-center text-base-content/50">
          总计 {{ totalDays }} 天
        </div>
      </div>

      <!-- 时间控制 -->
      <div class="divider my-2">时间控制</div>

      <!-- 当前速度显示 -->
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-base-content/70">当前速度:</span>
        <span class="text-sm font-semibold">
          {{ getSpeedLabel(timeSpeed) }}
        </span>
      </div>

      <!-- 速度选择按钮 -->
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="option in speedOptions"
          :key="option.value"
          class="btn btn-sm"
          :class="{
            'btn-primary': timeSpeed === option.value,
            'btn-ghost': timeSpeed !== option.value
          }"
          @click="setTimeSpeed(option.value)"
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
