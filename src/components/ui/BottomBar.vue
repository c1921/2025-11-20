<script setup lang="ts">
import type { World } from '../../world/World';
import TimeDisplay from './TimeDisplay.vue';

const props = defineProps<{
  world: World | null;
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
  <div class="absolute bottom-0 left-0 right-0 z-100 bg-[rgba(10,10,15,0.95)] backdrop-blur-md border-t border-white/10 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]">
    <div class="flex items-center justify-end gap-4 px-6 py-3 max-w-full mx-auto">
      <!-- 游戏控制按钮 -->
      <button
        class="btn btn-sm btn-accent"
        @click="emit('toggle-view')"
        :disabled="isGenerating"
        :title="isHeightmapMode ? '切换到彩色地图' : '切换到高度图'"
      >
        {{ isHeightmapMode ? '🎨 彩色' : '📊 高度' }}
      </button>

      <button
        class="btn btn-sm btn-info"
        @click="emit('save')"
        :disabled="isSaving || isGenerating"
      >
        {{ isSaving ? '保存中...' : '💾 保存' }}
      </button>

      <button
        class="btn btn-sm btn-ghost"
        @click="emit('return-menu')"
      >
        🏠 主菜单
      </button>

      <span v-if="saveMessage" class="text-xs text-green-400 whitespace-nowrap">
        {{ saveMessage }}
      </span>

      <!-- 设置按钮 - 打开抽屉 -->
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="game-drawer"
        data-overlay="#game-drawer"
      >
        ⚙️ 设置
      </button>

      <!-- TODO: 帮助按钮 -->
      <button class="btn btn-ghost btn-sm" disabled>
        ❓ 帮助
      </button>

      <!-- 时间显示 -->
      <TimeDisplay :world="world" />
    </div>
  </div>
</template>
