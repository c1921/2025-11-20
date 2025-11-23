<script setup lang="ts">
defineProps<{
  seedInput: string;
  erosionEnabled: boolean;
  isGenerating: boolean;
  isLoadingSave: boolean;
  isSaving: boolean;
  hasMap: boolean;
  saveMessage: string;
}>();

const emit = defineEmits<{
  generate: [];
  load: [];
  start: [];
  randomize: [];
  'update:seedInput': [value: string];
  'update:erosionEnabled': [value: boolean];
}>();
</script>

<template>
  <div class="card bg-base-300/90 backdrop-blur-sm shadow-xl w-80">
    <div class="card-body p-4">
      <h2 class="card-title text-warning">🗺️ 地图设置</h2>
      <p class="text-sm text-base-content/70">配置参数并生成你的世界</p>

      <div class="form-control mt-2">
        <label class="label">
          <span class="label-text font-semibold">随机种子</span>
        </label>
        <div class="join w-full">
          <input
            class="input input-bordered join-item flex-1"
            :value="seedInput"
            @input="emit('update:seedInput', ($event.target as HTMLInputElement).value)"
            type="text"
            :disabled="isGenerating"
            placeholder="输入或生成种子"
          >
          <button
            class="btn btn-warning join-item"
            type="button"
            @click="emit('randomize')"
            :disabled="isGenerating"
          >
            🎲
          </button>
        </div>
      </div>

      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text font-semibold">侵蚀效果</span>
          <input
            type="checkbox"
            class="toggle toggle-success"
            :checked="erosionEnabled"
            @change="emit('update:erosionEnabled', ($event.target as HTMLInputElement).checked)"
            :disabled="isGenerating"
          >
        </label>
      </div>

      <div class="flex flex-col gap-2 mt-2">
        <button
          class="btn btn-primary"
          @click="emit('generate')"
          :disabled="isGenerating"
        >
          {{ isGenerating ? '生成中...' : '🔄 生成新地图' }}
        </button>

        <button
          class="btn btn-secondary"
          @click="emit('load')"
          :disabled="isLoadingSave || isGenerating || isSaving"
        >
          {{ isLoadingSave ? '读取中...' : '📂 读取本地存档' }}
        </button>

        <button
          class="btn btn-success btn-lg"
          @click="emit('start')"
          :disabled="!hasMap || isGenerating"
        >
          🎮 开始游戏
        </button>

        <p v-if="saveMessage" class="text-xs text-success mt-1">{{ saveMessage }}</p>
      </div>
    </div>
  </div>
</template>
