<script setup lang="ts">
defineProps<{
  isHeightmapMode: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  saveMessage: string;
}>();

const emit = defineEmits<{
  'toggle-view': [];
  save: [];
  'return-menu': [];
}>();
</script>

<template>
  <div class="card bg-base-300/90 backdrop-blur-sm shadow-xl w-80">
    <div class="card-body p-4">
      <h2 class="card-title text-warning">游戏中</h2>
      <p class="text-sm text-base-content/70">🖱️ 拖动平移 • 滚轮缩放</p>
      <p class="text-sm text-base-content/70 mb-2">👣 点击地图任意位置，玩家会沿道路的最短路径前进</p>

      <div class="flex flex-col gap-2">
        <button
          class="btn btn-accent"
          @click="emit('toggle-view')"
          :disabled="isGenerating"
        >
          {{ isHeightmapMode ? '🎨 彩色地图' : '📊 高度图' }}
        </button>

        <button
          class="btn btn-info"
          @click="emit('save')"
          :disabled="isSaving || isGenerating"
        >
          {{ isSaving ? '保存中...' : '💾 保存' }}
        </button>

        <button
          class="btn btn-ghost"
          @click="emit('return-menu')"
        >
          🏠 返回主菜单
        </button>

        <p v-if="saveMessage" class="text-xs text-success mt-1">{{ saveMessage }}</p>
      </div>
    </div>
  </div>
</template>
