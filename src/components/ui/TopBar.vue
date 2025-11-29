<script setup lang="ts">
import type { World } from '../../world/World';

const props = defineProps<{
  world: World | null;
}>();

// TODO: 未来从 World 获取金钱、资源等数据
// const resources = computed(() => props.world?.getResourceManager()?.getResources());
</script>

<template>
  <div class="absolute top-0 left-0 right-0 z-100 bg-[rgba(10,10,15,0.95)] backdrop-blur-md border-b border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
    <div class="flex items-center justify-between px-6 py-3 max-w-full mx-auto">
      <!-- 左侧：游戏标题或主要信息 -->
      <div class="flex-1 flex items-center gap-4">
      </div>

      <!-- 中间：资源概况（占位） -->
      <div class="flex-1 flex items-center justify-center gap-8">
        <div class="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
          <span class="text-xl">💰</span>
          <span class="text-sm text-white/70">金钱:</span>
          <span class="text-sm font-semibold text-white/90 min-w-12 text-right font-mono">--</span>
        </div>
        <div class="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
          <span class="text-xl">🌾</span>
          <span class="text-sm text-white/70">粮食:</span>
          <span class="text-sm font-semibold text-white/90 min-w-12 text-right font-mono">--</span>
        </div>
        <div class="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
          <span class="text-xl">⚔️</span>
          <span class="text-sm text-white/70">兵力:</span>
          <span class="text-sm font-semibold text-white/90 min-w-12 text-right font-mono">--</span>
        </div>
      </div>

      <!-- 右侧：其他信息（占位） -->
      <div class="flex-1 flex items-center gap-4">
        <div class="text-sm text-base-content/70">
          <!-- 预留给其他信息 -->
        </div>
      </div>
    </div>
  </div>
</template>
