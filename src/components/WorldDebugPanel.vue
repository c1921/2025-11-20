<script setup lang="ts">
import { computed } from 'vue';
import type { World } from '../world/World';
import type { WorldSnapshot } from '../world/types';

const props = defineProps<{
  world: World | null;
  snapshot: WorldSnapshot;
}>();

// 使用传入的响应式 snapshot
const timeSystem = computed(() => props.world?.getTimeSystem());
const mapSystem = computed(() => props.world?.getMapSystem());

// 从 snapshot 获取响应式数据
const playerPosition = computed(() => props.snapshot.playerPosition);
const currentTime = computed(() => props.snapshot.currentTime);

// 格式化显示
const formattedTime = computed(() => {
  if (!currentTime.value) return '无';
  const t = currentTime.value;
  return `第 ${t.year} 年 ${t.month} 月 ${t.day} 日 (总计 ${t.year * 365 + t.month * 28 + t.day} 天)`;
});

const speedLabel = computed(() => {
  const speed = timeSystem.value?.getTimeSpeed();
  if (speed === undefined) return '无';
  return speed === 0 ? '暂停' : `${speed}x`;
});
</script>

<template>
  <div class="card bg-base-300/95 backdrop-blur-sm shadow-2xl border border-primary/30">
    <div class="card-body p-4">
      <h3 class="card-title text-sm text-primary flex items-center gap-2">
        🔍 World 调试面板
        <span class="badge badge-xs" :class="snapshot.isRunning ? 'badge-success' : 'badge-ghost'">
          {{ snapshot.isRunning ? '运行中' : '已暂停' }}
        </span>
      </h3>

      <div class="divider my-1"></div>

      <!-- World 基本状态 -->
      <div class="space-y-2 text-xs">
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-base-100/50 rounded p-2">
            <div class="text-base-content/50">初始化状态</div>
            <div class="font-semibold">
              {{ snapshot.isInitialized ? '✅ 已初始化' : '❌ 未初始化' }}
            </div>
          </div>
          <div class="bg-base-100/50 rounded p-2">
            <div class="text-base-content/50">运行状态</div>
            <div class="font-semibold">
              {{ snapshot.isRunning ? '▶️ 运行中' : '⏸️ 已暂停' }}
            </div>
          </div>
        </div>

        <!-- TimeSystem 状态 -->
        <div class="bg-base-100/50 rounded p-2">
          <div class="text-base-content/50 mb-1">⏰ 时间系统</div>
          <div class="space-y-1 pl-2">
            <div><span class="text-base-content/70">当前时间:</span> {{ formattedTime }}</div>
            <div><span class="text-base-content/70">速度:</span> {{ speedLabel }}</div>
          </div>
        </div>

        <!-- MapSystem 状态 -->
        <div class="bg-base-100/50 rounded p-2">
          <div class="text-base-content/50 mb-1">🗺️ 地图系统</div>
          <div class="space-y-1 pl-2">
            <div v-if="playerPosition">
              <span class="text-base-content/70">玩家位置:</span>
              ({{ playerPosition.x.toFixed(0) }}, {{ playerPosition.y.toFixed(0) }})
            </div>
            <div v-else>
              <span class="text-base-content/70">玩家位置:</span> 无
            </div>
          </div>
        </div>

        <!-- 系统引用 -->
        <div class="bg-base-100/50 rounded p-2">
          <div class="text-base-content/50 mb-1">📦 系统引用</div>
          <div class="space-y-1 pl-2">
            <div>
              <span class="text-base-content/70">TimeSystem:</span>
              {{ timeSystem ? '✅' : '❌' }}
            </div>
            <div>
              <span class="text-base-content/70">MapSystem:</span>
              {{ mapSystem ? '✅' : '❌' }}
            </div>
          </div>
        </div>
      </div>

      <div class="divider my-1"></div>

      <!-- 提示信息 -->
      <div class="text-xs text-base-content/50 text-center">
        开发模式下可通过 <code class="bg-base-100 px-1 rounded">window.__world__</code> 访问
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  min-width: 18rem;
  max-width: 20rem;
}

code {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}
</style>
