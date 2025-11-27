<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { PlayerLayer } from '../map/render/PlayerLayer';

const props = defineProps<{
  playerLayer: PlayerLayer | null;
}>();

const remainingDays = ref(0);
const isMoving = ref(false);

// 定时更新
let intervalId: number | null = null;

onMounted(() => {
  intervalId = window.setInterval(() => {
    if (props.playerLayer) {
      isMoving.value = props.playerLayer.isMoving || false;
      if (isMoving.value) {
        remainingDays.value = props.playerLayer.getRemainingDays();
      }
    }
  }, 100); // 每100ms更新一次
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div v-if="isMoving" class="card bg-base-300/90 backdrop-blur-sm shadow-xl">
    <div class="card-body p-3">
      <div class="flex items-center gap-2">
        <span class="text-sm">🚶 旅行中</span>
        <span class="text-sm font-bold text-primary">
          {{ remainingDays.toFixed(1) }} 天
        </span>
      </div>
    </div>
  </div>
</template>
